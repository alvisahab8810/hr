// pages/api/admin/invoices/index.js — the invoices behind Website → Invoices.
// GET hands back every invoice plus the proposals and leads they hang off, so
// the board is one round trip like the rest of the CRM.
import dbConnect from "@/utils/dbConnect";
import { cleanItems, itemsTotal, itemsLabel, docItems } from "@/utils/proposalItems";
import Invoice from "@/models/Invoice";
import Proposal from "@/models/Proposal";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { salesId } from "@/utils/salesAuth";
import { ownsLead } from "@/utils/leadScope";
import { startInvoiceAutomation } from "@/utils/invoiceAutomation";

const addDays = (d, n) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  // Starts once per Node process; the interval then runs with nobody watching.
  startInvoiceAutomation();
  await dbConnect();

  try {
    if (req.method === "GET") {
      // A salesperson only sees the paperwork of the leads assigned to them.
      const mine = salesId(req);
      const own = mine
        ? (await Query.find({ salespersonId: mine }).select("_id").lean()).map((l) => l._id)
        : null;
      const scope = own ? { leadId: { $in: own } } : {};
      const [invoices, proposals, leads] = await Promise.all([
        Invoice.find(scope).sort({ createdAt: -1 }).lean(),
        Proposal.find(scope).select("co contact em ph svc amount term months advPct status leadId owner").lean(),
        Query.find(own ? { salespersonId: mine } : {}).select("name businessName email phone").lean(),
      ]);
      return res.status(200).json({
        success: true,
        data: invoices.map((i) => ({
          ...i, _id: String(i._id),
          leadId: String(i.leadId),
          proposalId: i.proposalId ? String(i.proposalId) : "",
        })),
        proposals: proposals.map((p) => ({ ...p, _id: String(p._id), leadId: String(p.leadId) })),
        leads: leads.map((l) => ({ ...l, _id: String(l._id) })),
      });
    }

    if (req.method === "POST") {
      const b = req.body || {};

      // Raising the whole schedule off a proposal in one go: the advance now,
      // then one invoice a month for the length of the retainer.
      if (b.schedule && b.proposalId) {
        const p = await Proposal.findById(b.proposalId).lean();
        if (!p) return res.status(404).json({ success: false, message: "Proposal not found" });
        if (!(await ownsLead(req, res, p.leadId))) return;

        // The same gate the board shows: nothing is billed off a proposal the
        // client has not accepted yet.
        if (p.status !== "Accepted") {
          return res.status(400).json({ success: false, message: "Only an accepted proposal can be invoiced" });
        }

        const already = await Invoice.countDocuments({ proposalId: p._id });
        if (already) {
          return res.status(409).json({ success: false, message: "This proposal already has invoices raised" });
        }

        const issued = b.issued || new Date().toISOString().slice(0, 10);
        const adv = Math.round(((p.amount || 0) * (p.advPct || 0)) / 100);
        const rest = (p.amount || 0) - adv;
        const months = p.term === "Retainer" ? Math.max(1, Number(p.months || 1)) : 0;

        const base = {
          proposalId: p._id, leadId: p.leadId, co: p.co, contact: p.contact, em: p.em, ph: p.ph,
          svc: p.svc, gstPct: Number(b.gstPct ?? 18), owner: p.owner || "",
        };

        // Every invoice in the schedule bills a slice of the proposal, so each
        // service is carried across in the same proportion. That way a three
        // service deal still reads as three lines on every single invoice.
        const lines = docItems(p);
        const slice = (part) => {
          const tot = p.amount || 0;
          if (!tot || lines.length < 2) return [];
          const out = lines.map((it) => ({ svc: it.svc, note: it.note || "", amount: Math.round((Number(it.amount || 0) * part) / tot) }));
          // Rounding must not lose or invent a rupee — the last line absorbs it.
          const off = part - out.reduce((n, x) => n + x.amount, 0);
          if (off) out[out.length - 1].amount += off;
          return out;
        };

        const docs = [];
        if (b.single) {
          docs.push({ ...base, kind: "One time", amount: p.amount || 0, items: slice(p.amount || 0),
            issued, due: addDays(issued, 7), status: "Draft" });
        } else if (adv > 0) {
          docs.push({ ...base, kind: "Advance", amount: adv, items: slice(adv), issued, due: addDays(issued, 7), status: "Draft" });
        }
        if (!b.single && months) {
          const per = Math.round(rest / months);
          for (let m = 1; m <= months; m += 1) {
            const on = addDays(issued, 30 * m);
            docs.push({
              ...base, kind: "Monthly", monthNo: m, ofMonths: months,
              amount: per, items: slice(per), issued: on, due: addDays(on, 7), status: "Draft",
            });
          }
        } else if (!b.single && rest > 0) {
          // A balance only waits when an advance went out first; with nothing
          // taken up front the whole fee is billed today.
          const on = adv > 0 ? addDays(issued, 30) : issued;
          docs.push({ ...base, kind: adv > 0 ? "Balance" : "One time", amount: rest, items: slice(rest),
            issued: on, due: addDays(on, 7), status: "Draft" });
        }

        const made = await Invoice.insertMany(docs);
        await Query.findByIdAndUpdate(p.leadId, {
          $push: { events: { at: new Date(), type: "invoice", text: `${made.length} invoice${made.length === 1 ? "" : "s"} raised` } },
        }).catch(() => {});

        return res.status(201).json({ success: true, count: made.length });
      }

      // One invoice, by hand.
      if (!b.leadId) return res.status(400).json({ success: false, message: "Pick a lead first" });
      if (!(await ownsLead(req, res, b.leadId))) return;
      const lead = await Query.findById(b.leadId).lean();
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

      // An invoice by hand can carry several lines; the total is their sum.
      const items = cleanItems(b.items);
      const amount = items.length ? itemsTotal(items) : Number(b.amount || 0);
      if (!amount) return res.status(400).json({ success: false, message: "Put an amount on it" });

      const billTo = {
        address: String(b.billTo?.address || "").trim(),
        city:    String(b.billTo?.city || "").trim(),
        state:   String(b.billTo?.state || "").trim(),
        pincode: String(b.billTo?.pincode || "").trim(),
        gstin:   String(b.billTo?.gstin || "").trim().toUpperCase(),
      };

      // An invoice may be tied to a proposal, but only to one of this lead's —
      // stored unchecked it would have put the invoice on a stranger's deal.
      let linked = null;
      if (b.proposalId) {
        const prop = await Proposal.findById(b.proposalId).select("leadId").lean();
        if (!prop || String(prop.leadId) !== String(lead._id)) {
          return res.status(400).json({ success: false, message: "That proposal is not this lead's" });
        }
        linked = prop._id;
      }

      const issued = b.issued || new Date().toISOString().slice(0, 10);
      const created = await Invoice.create({
        leadId: lead._id,
        proposalId: linked,
        // Whatever was typed into the form wins; the lead only prefills it.
        co: String(b.co || lead.businessName || lead.name || "").trim(),
        contact: String(b.contact || lead.name || "").trim(),
        em: String(b.em || lead.email || "").trim(),
        ph: String(b.ph || lead.phone || "").trim(),
        billTo,
        poRef: String(b.poRef || "").trim(),
        kind: b.kind || "One time",
        items,
        svc: items.length ? itemsLabel(items) : String(b.svc || "").trim(),
        amount,
        gstPct: Number(b.gstPct ?? 18),
        issued,
        due: b.due || addDays(issued, 7),
        status: "Draft",
        owner: String(b.owner || "").trim(),
        notes: String(b.notes || "").trim(),
      });

      return res.status(201).json({
        success: true,
        data: { ...created.toObject(), _id: String(created._id), leadId: String(created.leadId) },
      });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("invoices api:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
