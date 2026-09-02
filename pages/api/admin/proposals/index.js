// pages/api/admin/proposals/index.js — the proposals behind Website → Proposals.
// GET returns every proposal plus the thin slice of each parent lead the board
// needs, so the page is one round trip like the Leads board.
import dbConnect from "@/utils/dbConnect";
import Proposal from "@/models/Proposal";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const [props, leads] = await Promise.all([
        Proposal.find({}).sort({ createdAt: -1 }).lean(),
        Query.find({}).select("name businessName email phone budget service status salespersonId").lean(),
      ]);
      return res.status(200).json({
        success: true,
        data: props.map((p) => ({ ...p, _id: String(p._id), leadId: String(p.leadId) })),
        leads: leads.map((l) => ({ ...l, _id: String(l._id) })),
      });
    }

    if (req.method === "POST") {
      const b = req.body || {};
      if (!b.leadId) return res.status(400).json({ success: false, message: "Pick a lead first" });

      const lead = await Query.findById(b.leadId).lean();
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

      const amount = Number(b.amount || 0);
      if (!amount || amount < 0) {
        return res.status(400).json({ success: false, message: "Put a value on it" });
      }

      const created = await Proposal.create({
        leadId: lead._id,
        co: lead.businessName || lead.name || "",
        contact: lead.name || "",
        em: lead.email || "",
        ph: lead.phone || "",
        svc: String(b.svc || lead.service || "").trim(),
        amount,
        term: b.term || "Retainer",
        months: Number(b.months || 1),
        advPct: Number(b.advPct || 0),
        validTill: b.validTill || "",
        owner: String(b.owner || "").trim(),
        notes: String(b.notes || "").trim(),
        // Nothing leaves the building until the admin has seen it.
        approval: "Awaiting approval",
        status: "Draft",
      });

      // The lead's own timeline should show that a number went out.
      await Query.findByIdAndUpdate(lead._id, {
        $push: { events: { at: new Date(), type: "proposal", text: `Proposal raised — ₹${amount.toLocaleString("en-IN")}` } },
      }).catch(() => {});

      return res.status(201).json({
        success: true,
        data: { ...created.toObject(), _id: String(created._id), leadId: String(created.leadId) },
      });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("proposals api:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
