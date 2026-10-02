// pages/api/admin/clients/crm.js — the clients the CRM is actually running,
// with the money against each of them.
//
// A client only exists once a lead has been won and converted, so the whole
// picture is stitched together from four places: the Client record itself, the
// leads that point at it, every invoice raised against those leads, and the
// brands Operations hung off the client. Nothing new is stored — this reads
// what the board already has and adds it up.
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Query from "@/models/Query";
import Proposal from "@/models/Proposal";
import Invoice from "@/models/Invoice";
import Brand from "@/models/tasks/Brand";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { salesId } from "@/utils/salesAuth";

const today = () => new Date().toISOString().slice(0, 10);

const gstOf = (i) => Math.round(((i.amount || 0) * (i.gstPct || 0)) / 100);
const grand = (i) => (i.amount || 0) + gstOf(i);
const paid  = (i) => (i.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0);

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  await dbConnect();

  try {
    // A salesperson sees the clients that came out of their own leads, the
    // same way the rest of the CRM is scoped.
    const mine = salesId(req);
    const leadWhere = { clientId: { $ne: null } };
    if (mine) leadWhere.salespersonId = mine;

    const leads = await Query.find(leadWhere)
      .select("clientId businessName name email phone city salespersonId convertedAt status")
      .lean();
    if (!leads.length) return res.status(200).json({ success: true, data: [] });

    const leadIds   = leads.map((l) => l._id);
    const clientIds = [...new Set(leads.map((l) => String(l.clientId)))];

    const [clients, invoices, proposals, brands] = await Promise.all([
      Client.find({ _id: { $in: clientIds } })
        .select("clientId name email phone company address status notes createdAt").lean(),
      Invoice.find({ leadId: { $in: leadIds } })
        .select("leadId proposalId amount gstPct status issued due payments svc kind createdAt").lean(),
      Proposal.find({ leadId: { $in: leadIds } })
        .select("leadId amount term months status svc createdAt").lean(),
      Brand.find({ clientId: { $in: clientIds } })
        .select("name clientId services isActive logo color").lean(),
    ]);

    // Everything is keyed by the client it rolls up to, so each list is walked
    // once instead of once per client.
    const byClient = new Map(clientIds.map((id) => [id, {
      leads: [], invoices: [], proposals: [], brands: [],
    }]));
    const leadClient = new Map(leads.map((l) => [String(l._id), String(l.clientId)]));

    for (const l of leads) byClient.get(String(l.clientId))?.leads.push(l);
    for (const b of brands) byClient.get(String(b.clientId))?.brands.push(b);
    for (const p of proposals) byClient.get(leadClient.get(String(p.leadId)))?.proposals.push(p);
    for (const i of invoices) byClient.get(leadClient.get(String(i.leadId)))?.invoices.push(i);

    const now = today();

    const data = clients.map((c) => {
      const g = byClient.get(String(c._id)) || { leads: [], invoices: [], proposals: [], brands: [] };
      const lead = g.leads[0] || {};

      // A draft has not been asked for yet, and a cancelled one never will be,
      // so neither counts as billed.
      const live = g.invoices.filter((i) => i.status !== "Cancelled");
      const out  = live.filter((i) => i.status !== "Draft");

      const billed   = out.reduce((n, i) => n + grand(i), 0);
      const received = live.reduce((n, i) => n + paid(i), 0);
      const drafts   = live.filter((i) => i.status === "Draft");
      const overdueL = out.filter((i) => i.status !== "Paid" && i.due && i.due < now);

      // What they are on: the accepted retainer tells us what repeats, and the
      // oldest invoice tells us how long they have been a client.
      const won = g.proposals.filter((p) => p.status === "Accepted");
      const retainer = won.find((p) => p.term === "Retainer") || null;
      const dates = out.map((i) => i.issued).filter(Boolean).sort();

      return {
        _id: String(c._id),
        clientId: c.clientId || "",
        name: c.name || "",
        company: c.company || lead.businessName || "",
        email: c.email || "",
        phone: c.phone || lead.phone || "",
        city: c.address || lead.city || "",
        status: c.status || "Active",
        since: dates[0] || (lead.convertedAt ? String(lead.convertedAt).slice(0, 10) : ""),
        owner: lead.salespersonId ? String(lead.salespersonId) : "",
        leadId: lead._id ? String(lead._id) : "",

        brands: g.brands.map((b) => ({
          _id: String(b._id), name: b.name, services: b.services || [],
          isActive: b.isActive !== false, color: b.color || "#6366F1",
        })),
        services: [...new Set([
          ...g.brands.flatMap((b) => b.services || []),
          ...won.flatMap((p) => String(p.svc || "").split(" + ")).filter(Boolean),
        ])],

        billed, received,
        outstanding: Math.max(0, billed - received),
        overdue: overdueL.reduce((n, i) => n + Math.max(0, grand(i) - paid(i)), 0),
        overdueCount: overdueL.length,
        draftValue: drafts.reduce((n, i) => n + grand(i), 0),
        draftCount: drafts.length,
        invoiceCount: out.length,
        lastInvoice: dates.length ? dates[dates.length - 1] : "",
        // The next bill that is still owed, so the follow up is obvious.
        nextDue: out.filter((i) => i.status !== "Paid" && i.due)
          .map((i) => i.due).sort()[0] || "",

        dealValue: won.reduce((n, p) => n + (p.amount || 0), 0),
        monthly: retainer && retainer.months
          ? Math.round((retainer.amount || 0) / Math.max(1, retainer.months)) : 0,
        retainerMonths: retainer ? retainer.months || 0 : 0,
        proposalCount: g.proposals.length,
      };
    });

    // Biggest client first — the board is read top down.
    data.sort((a, b) => b.billed - a.billed || b.dealValue - a.dealValue);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
