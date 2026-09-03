// pages/api/admin/leads/[id]/profile.js — one lead and everything hanging off
// it: the proposals raised on it and the invoices raised off those. The Lead
// profile page is the one place where the whole story sits together.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import Proposal from "@/models/Proposal";
import Invoice from "@/models/Invoice";
import User from "@/models/User";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad lead id" });
  }

  // A salesperson only reaches their own leads.
  if (!(await ownsLead(req, res, id))) return;

  try {
    const lead = await Query.findById(id).lean();
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const [proposals, invoices, owner] = await Promise.all([
      Proposal.find({ leadId: lead._id }).sort({ createdAt: -1 }).lean(),
      Invoice.find({ leadId: lead._id }).sort({ issued: 1 }).lean(),
      lead.salespersonId
        ? User.findById(lead.salespersonId).select("name email").lean().catch(() => null)
        : null,
    ]);

    return res.status(200).json({
      success: true,
      lead: {
        ...lead,
        _id: String(lead._id),
        customFields: lead.customFields instanceof Map
          ? Object.fromEntries(lead.customFields)
          : (lead.customFields || {}),
      },
      owner: owner ? { _id: String(owner._id), name: owner.name, email: owner.email } : null,
      proposals: proposals.map((p) => ({ ...p, _id: String(p._id), leadId: String(p.leadId) })),
      invoices: invoices.map((i) => ({
        ...i, _id: String(i._id), leadId: String(i.leadId),
        proposalId: i.proposalId ? String(i.proposalId) : "",
      })),
    });
  } catch (error) {
    console.error("lead profile:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
