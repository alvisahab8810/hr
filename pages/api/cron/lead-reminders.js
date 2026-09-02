// GET /api/cron/lead-reminders?secret=<CRON_SECRET>
// The reminder ladder, run by the clock instead of by hand. Set this cron to
// run every 15 minutes in Hostinger, e.g. */15 * * * *
// For every lead with a meeting still ahead it works out which rungs of the
// LADDER are due, skips anything already in remindersSent (the same record the
// manual "Send now" writes, so the two can never double-send) and mails the
// rest. Meeting times are IST.
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import { LADDER } from "@/utils/leadsMeta";
import { buildLeadMail, sendLeadMail } from "@/utils/leadMail";

const LABEL = {
  confirm: "Meeting confirmation",
  d2: "Reminder · 2 days before",
  d1: "Reminder · 1 day before",
  h3: "Reminder · 3 hours before",
  m45: "Reminder · 45 mins before",
};

// "2026-09-04" + "16:30" (IST) -> epoch ms. Missing time means 10:00 IST.
function meetingAt(lead) {
  if (!lead.meetingDate) return 0;
  const t = /^\d{2}:\d{2}$/.test(lead.meetingTime || "") ? lead.meetingTime : "10:00";
  const ms = Date.parse(`${lead.meetingDate}T${t}:00+05:30`);
  return Number.isNaN(ms) ? 0 : ms;
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    await dbConnect();
    const now = Date.now();
    const today = new Date(now - 0).toISOString().slice(0, 10);

    // Only leads whose meeting is today or later, that still have an address,
    // and that haven't already been marked held / no-show / lost.
    const leads = await Query.find({
      meetingDate: { $gte: today },
      email: { $nin: ["", null] },
      held: { $in: ["", null] },
      status: { $nin: ["Lost", "Won"] },
    })
      .select("name email meetingDate meetingTime remindersSent status")
      .lean();

    const sent = [];
    const skipped = [];

    for (const lead of leads) {
      const at = meetingAt(lead);
      if (!at || at <= now) continue;

      const already = new Set((lead.remindersSent || []).map((r) => r.key));
      // A rung is due once we are inside its window; "confirm" is due the
      // moment a meeting exists. Tightest first.
      const due = LADDER.filter(
        (r) => !already.has(r.k) && (r.off === null || now >= at - r.off * 3600000)
      ).sort((a, b) => (a.off === null ? 1e9 : a.off) - (b.off === null ? 1e9 : b.off));

      if (!due.length) continue;

      // Catching up (a cron that was down, or a meeting booked at short
      // notice) must not dump four mails on one lead: only the tightest rung
      // goes out, the rest are recorded as passed so they never fire late.
      const [send, ...passed] = due;
      const push = { remindersSent: { $each: [] }, events: { $each: [] } };
      try {
        const mail = buildLeadMail(send.k, lead);
        if (!mail) continue;
        await sendLeadMail({ to: lead.email, subject: mail.subject, html: mail.html });
        push.remindersSent.$each.push({ key: send.k, at: new Date() });
        push.events.$each.push({
          at: new Date(),
          type: "mail",
          text: `${LABEL[send.k] || send.n} sent automatically to ${lead.email}`,
        });
        sent.push({ lead: String(lead._id), key: send.k });
      } catch (e) {
        // One bad address must not stop the run.
        skipped.push({ lead: String(lead._id), key: send.k, error: e?.message });
        continue;
      }
      for (const p of passed) {
        push.remindersSent.$each.push({ key: p.k, at: new Date() });
      }
      await Query.findByIdAndUpdate(lead._id, { $push: push }).catch(() => {});
    }

    return res.status(200).json({ success: true, checked: leads.length, sent, skipped });
  } catch (error) {
    console.error("lead reminders cron:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
