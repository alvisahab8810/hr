// pages/api/admin/proposals/[id]/index.js — edit one proposal.
// PATCH carries whatever changed: the commercials, the admin's decision, a
// follow-up to append, or the status. DELETE drops it.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Proposal from "@/models/Proposal";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";
import { salesId } from "@/utils/salesAuth";

const FIELDS = [
  "svc", "amount", "term", "months", "advPct", "validTill", "owner", "notes",
  "adminNote", "nextfu",
];

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad proposal id" });
  }

  // The document belongs to a lead, and the lead has an owner.
  const parent = await Proposal.findById(id).select("leadId").lean();
  if (parent && !(await ownsLead(req, res, parent.leadId))) return;

  try {
    if (req.method === "DELETE") {
      await Proposal.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    if (req.method !== "PATCH") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const b = req.body || {};
    const current = await Proposal.findById(id).lean();
    if (!current) return res.status(404).json({ success: false, message: "Proposal not found" });

    const set = {};
    for (const k of FIELDS) {
      if (b[k] === undefined) continue;
      set[k] = ["amount", "months", "advPct"].includes(k) ? Number(b[k] || 0) : b[k];
    }

    // The agreement, which only exists after the client has accepted.
    if (b.agreement) {
      const g = b.agreement;
      const now = current.agreement?.status || "Not sent";
      if ((g.status === "Draft" || g.status === "Sent") && current.status !== "Accepted") {
        return res.status(400).json({ success: false, message: "The client has to accept the proposal before the agreement goes out" });
      }
      if ((g.status === "Sent" || g.status === "Follow up") && now === "Not sent" && g.status !== "Sent") {
        return res.status(400).json({ success: false, message: "Draft the agreement first" });
      }
      if ((g.status === "Approved" || g.status === "Rejected") && (now === "Not sent" || now === "Draft")) {
        return res.status(400).json({ success: false, message: "Send the agreement first" });
      }
      if (g.status) {
        set["agreement.status"] = g.status;
        if (g.status === "Draft" && !current.agreement?.createdOn) set["agreement.createdOn"] = new Date();
        if (g.status === "Sent") set["agreement.sentOn"] = new Date();
        if (g.status === "Approved" || g.status === "Rejected") set["agreement.decidedOn"] = new Date();
      }
      for (const k of ["title", "startDate", "endDate", "fuOn", "note"]) {
        if (g[k] !== undefined) set["agreement." + k] = String(g[k] || "");
      }
      if (Array.isArray(g.clauses)) {
        set["agreement.clauses"] = g.clauses
          .map((c) => ({ h: String(c?.h || "").trim(), t: String(c?.t || "").trim() }))
          .filter((c) => c.h || c.t);
      }
    }

    // The admin's decision.
    // The decision is the admin's. A salesperson only requests it.
    if ((b.approval || b.adminNote !== undefined) && salesId(req)) {
      return res.status(403).json({ success: false, message: "Only an admin can approve a proposal" });
    }

    if (b.approval) {
      set.approval = b.approval;
      set.approvedOn = new Date();
      if (b.approvedBy) set.approvedBy = b.approvedBy;
    }

    // A proposal can only be sent once the admin has approved it.
    if (b.status) {
      if (b.status === "Sent" && (b.approval || current.approval) !== "Approved") {
        return res.status(400).json({ success: false, message: "This one still needs approval before it can go out" });
      }
      set.status = b.status;
      if (b.status === "Sent" && !current.sent) set.sent = new Date();
    }

    const update = { $set: set };
    if (b.followup && String(b.followup.text || "").trim()) {
      update.$push = {
        followups: {
          at: new Date(),
          type: b.followup.type || "mail",
          text: String(b.followup.text).trim(),
          by: String(b.followup.by || ""),
        },
      };
    }

    const saved = await Proposal.findByIdAndUpdate(id, update, { new: true }).lean();

    // Sending one moves the lead along, unless it is already further ahead.
    if (b.status === "Sent" && current.status !== "Sent") {
      // Only forward: a lead already in negotiation or won stays where it is.
      await Query.findOneAndUpdate(
        { _id: saved.leadId, status: { $in: ["New", "Contacted", "NPC", "Meeting booked", "Consultation done", "Qualified"] } },
        {
          $set: { status: "Proposal sent" },
          $push: { events: { at: new Date(), type: "proposal", text: "Proposal sent to the client" } },
        }
      ).catch(() => {});
    }

    // Winning a proposal wins the lead.
    if (b.status === "Accepted") {
      await Query.findByIdAndUpdate(saved.leadId, {
        $set: { status: "Won" },
        $push: { events: { at: new Date(), type: "proposal", text: "Proposal accepted" } },
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      data: { ...saved, _id: String(saved._id), leadId: String(saved.leadId) },
    });
  } catch (error) {
    console.error("proposal patch:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
