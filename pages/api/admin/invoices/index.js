// pages/api/admin/invoices/index.js — the invoices behind Website → Invoices.
// GET hands back every invoice plus the proposals and leads they hang off, so
// the board is one round trip like the rest of the CRM.
import dbConnect from "@/utils/dbConnect";
import Invoice from "@/models/Invoice";
import Proposal from "@/models/Proposal";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { salesId } from "@/utils/salesAuth";
import { ownsLead } from "@/utils/leadScope";

const addDays = (d, n) => {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
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

        const docs = [];
        if (adv > 0) {
          docs.push({ ...base, kind: "Advance", amount: adv, issued, due: addDays(issued, 7), status: "Draft" });
        }
        if (months) {
          const per = Math.round(rest / months);
          for (let m = 1; m <= months; m += 1) {
            const on = addDays(issued, 30 * m);
            docs.push({
              ...base, kind: "Monthly", monthNo: m, ofMonths: months,
              amount: per, issued: on, due: addDays(on, 7), status: "Draft",
            });
          }
        } else if (rest > 0) {
          docs.push({ ...base, kind: "Balance", amount: rest, issued: addDays(issued, 30), due: addDays(issued, 37), status: "Draft" });
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

      const amount = Number(b.amount || 0);
      if (!amount) return res.status(400).json({ success: false, message: "Put an amount on it" });

      const issued = b.issued || new Date().toISOString().slice(0, 10);
      const created = await Invoice.create({
        leadId: lead._id,
        proposalId: b.proposalId || null,
        co: lead.businessName || lead.name || "",
        contact: lead.name || "",
        em: lead.email || "",
        ph: lead.phone || "",
        kind: b.kind || "One time",
        svc: String(b.svc || "").trim(),
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
