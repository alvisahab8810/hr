// pages/api/admin/reports.js — everything the Reports page counts, in one trip.
// Nothing is stored for reporting: the funnel, the revenue months and the
// collections are all derived from the leads, proposals and invoices that the
// CRM already writes.
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import Proposal from "@/models/Proposal";
import Invoice from "@/models/Invoice";
import Salesperson from "@/models/Salesperson";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Method not allowed" });
  await dbConnect();

  try {
    const [leads, proposals, invoices, team] = await Promise.all([
      Query.find({})
        .select("name businessName status budget source formType service salespersonId meetingDate held score prep lostReason createdAt")
        .lean(),
      Proposal.find({}).select("leadId status approval sent amount term owner createdAt").lean(),
      Invoice.find({}).select("leadId proposalId amount gstPct status issued due paidOn kind").lean(),
      Salesperson.find({}).select("name role active").lean().catch(() => []),
    ]);

    return res.status(200).json({
      success: true,
      leads: leads.map((l) => ({ ...l, _id: String(l._id), salespersonId: l.salespersonId ? String(l.salespersonId) : "" })),
      proposals: proposals.map((p) => ({ ...p, _id: String(p._id), leadId: String(p.leadId) })),
      invoices: invoices.map((i) => ({ ...i, _id: String(i._id), leadId: String(i.leadId) })),
      team: (team || []).map((t) => ({ ...t, _id: String(t._id) })),
    });
  } catch (error) {
    console.error("reports api:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
