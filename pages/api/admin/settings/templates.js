// pages/api/admin/settings/templates.js — the real mail templates, listed with
// the subject line each one actually sends. Built by calling the same
// buildLeadMail the Leads board uses, against a sample lead.
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { buildLeadMail } from "@/utils/leadMail";

const LIST = [
  ["invite", "We'll call you shortly", "Before the call"],
  ["invite2", "Follow-up — can't reach you", "Before the call"],
  ["confirm", "Meeting confirmation", "The meeting"],
  ["d2", "Reminder — 2 days before", "The meeting"],
  ["d1", "Reminder — 1 day before", "The meeting"],
  ["h3", "Reminder — 3 hours before", "The meeting"],
  ["m45", "Reminder — 45 mins before", "The meeting"],
  ["noshow", "They didn't turn up", "The meeting"],
  ["recap", "Post-consultation recap", "After the meeting"],
  ["material", "Material pack", "After the meeting"],
  ["proposal", "Proposal sent", "Proposal"],
  ["follow1", "Gentle follow-up", "Follow up"],
  ["follow2", "Value reinforcement", "Follow up"],
  ["follow3", "Decision-maker loop-in", "Follow up"],
  ["objBudget", "Objection — budget", "Negotiation"],
  ["objTiming", "Objection — timing", "Negotiation"],
  ["discount", "Discount offer", "Negotiation"],
  ["fomo", "Capacity close", "Negotiation"],
];

const SAMPLE = { name: "Sample Prospect", businessName: "Sample Co", meetingDate: "2026-01-01", meetingTime: "11:00", meetingMode: "Google Meet" };

export default function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Method not allowed" });

  const data = LIST.map(([k, n, g]) => {
    let subject = "—";
    try { subject = buildLeadMail(k, SAMPLE)?.subject || "—"; } catch {}
    return { k, n, g, subject };
  });
  return res.status(200).json({ success: true, data });
}
