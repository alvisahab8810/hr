// pages/api/admin/proposals/[id]/mail.js — the compose box behind a proposal
// or its agreement. GET hands back the draft, POST sends what the user edited
// with the PDF attached, and can mark the document as sent in the same call.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Proposal from "@/models/Proposal";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";
import { docDraft, sendDocMail } from "@/utils/docMail";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad proposal id" });
  }

  const p = await Proposal.findById(id).lean();
  if (!p) return res.status(404).json({ success: false, message: "Proposal not found" });
  if (!(await ownsLead(req, res, p.leadId))) return;

  const kind = (req.query.kind || req.body?.kind) === "agreement" ? "agreement" : "proposal";

  try {
    if (req.method === "GET") {
      return res.status(200).json({ success: true, draft: docDraft(kind, p) });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const { to, subject, body, markSent } = req.body || {};
    if (!to) return res.status(400).json({ success: false, message: "There is no address to send it to" });

    if (kind === "proposal" && markSent && p.approval !== "Approved") {
      return res.status(400).json({ success: false, message: "This one still needs approval before it can go out" });
    }

    await sendDocMail(kind, p, { to, subject, body });

    if (markSent) {
      const set = kind === "agreement"
        ? { "agreement.status": "Sent", "agreement.sentOn": new Date() }
        : { status: "Sent", ...(p.sent ? {} : { sent: new Date() }) };
      await Proposal.findByIdAndUpdate(id, { $set: set });
    }

    await Query.findByIdAndUpdate(p.leadId, {
      $push: {
        events: {
          at: new Date(),
          type: "proposal",
          text: `${kind === "agreement" ? "Agreement" : "Proposal"} mailed to ${to}`,
        },
      },
    }).catch(() => {});

    // Sending the proposal moves the lead along, unless it is already ahead.
    if (kind === "proposal" && markSent) {
      await Query.findOneAndUpdate(
        { _id: p.leadId, status: { $in: ["New", "Contacted", "NPC", "Meeting booked", "Consultation done", "Qualified"] } },
        { $set: { status: "Proposal sent" } }
      ).catch(() => {});
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("proposal mail:", e?.message);
    return res.status(500).json({ success: false, message: e?.message || "The mail did not go out" });
  }
}

