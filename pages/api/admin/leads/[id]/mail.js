// pages/api/admin/leads/[id]/mail.js — send a lead one of the CRM mails:
// the "we'll call you" note while nothing is fixed, the confirmation and
// reminder ladder once a meeting is on the calendar, or a one-off message
// typed by hand.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";
import { buildLeadMail, sendLeadMail } from "@/utils/leadMail";

const LABEL = {
  invite:   "“We'll call you” note",
  invite2:  "Follow-up nudge",
  confirm:  "Meeting confirmation",
  d2:       "Reminder · 2 days before",
  d1:       "Reminder · 1 day before",
  h3:       "Reminder · 3 hours before",
  m45:      "Reminder · 45 mins before",
  material: "Material pack",
  noshow:   "No-show follow-up",
  recap:     "Post-consultation recap",
  proposal:  "Proposal sent",
  follow1:   "Gentle follow-up",
  follow2:   "Value reinforcement",
  follow3:   "Decision-maker loop-in",
  objBudget: "Objection · budget",
  objTiming: "Objection · timing",
  discount:  "Discount offer",
  fomo:      "Capacity close",
  custom:   "Message",
};

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "POST") {
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
    if (!lead.email) {
      return res.status(400).json({ success: false, message: "This lead has no email address" });
    }

    const template = String(req.body?.template || "invite");

    const subject = String(req.body?.subject || "").trim();
    const body = String(req.body?.body || "").trim();

    let mail;
    // The composer shows the wording and lets the team edit it, so whatever
    // came back from the screen wins — the template only names the log line.
    if (subject && body) {
      mail = {
        subject,
        html: body
          .split(/\n{2,}/)
          .map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`)
          .join(""),
      };
    } else if (template === "custom") {
      return res.status(400).json({ success: false, message: "Subject and message are both needed" });
    } else {
      mail = buildLeadMail(template, lead);
      if (!mail) return res.status(400).json({ success: false, message: "Unknown mail template" });
    }

    // Awaited on purpose — the team needs to know the mail actually left.
    const cc = String(req.body?.cc || "").trim();
    await sendLeadMail({ to: lead.email, cc, subject: mail.subject, html: mail.html });

    const label = LABEL[template] || "Message";
    const saved = await Query.findByIdAndUpdate(
      id,
      {
        $push: {
          remindersSent: { key: template, at: new Date() },
          events: { at: new Date(), type: "mail", text: `${label} sent to ${lead.email}` },
        },
        // A lead we've mailed is no longer untouched.
        ...(lead.status === "New" ? { $set: { status: "Contacted" } } : {}),
      },
      { new: true }
    ).lean();

    return res.status(200).json({
      success: true,
      message: `${label} sent to ${lead.email}`,
      data: { ...saved, _id: String(saved._id) },
    });
  } catch (error) {
    console.error("lead mail:", error?.message);
    return res.status(500).json({ success: false, message: error.message || "Could not send that mail" });
  }
}
