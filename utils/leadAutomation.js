// utils/leadAutomation.js — the lead mails that go out without anyone clicking.
//
// Two jobs, both driven off the same record (remindersSent) the manual
// "Send now" writes, so a mail can never go twice:
//   1. autoReply — a brand new lead, from the website form or added by hand,
//      gets the "invite" acknowledgement.
//   2. reminders — the LADDER rungs before a booked meeting.
//
// It runs on a timer inside the Node process (see startLeadAutomation) and the
// /api/cron/lead-reminders endpoint calls the same function, so an external
// cron stays a safe backup rather than the only trigger.
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import { LADDER } from "@/utils/leadsMeta";
import { buildLeadMail, sendLeadMail } from "@/utils/leadMail";

const LABEL = {
  invite: "Auto-reply",
  material: "Post-meeting pack",
  noshow: "Missed the meeting",
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

// The day the auto-reply went live. Nothing older than this is ever mailed.
const LIVE_FROM = Date.parse("2026-09-03T00:00:00+05:30");

const hasKey = (lead, k) => (lead.remindersSent || []).some((r) => r.key === k);

async function mark(lead, key, text) {
  await Query.findByIdAndUpdate(lead._id, {
    $push: {
      remindersSent: { key, at: new Date() },
      events: { at: new Date(), type: "mail", text },
    },
  }).catch(() => {});
}

/* Every fresh lead with an address gets one acknowledgement. */
async function autoReply(sent, skipped) {
  // Only look back a couple of days, and never past the day this was switched
  // on: turning it on must not mail the whole history.
  const since = new Date(Math.max(Date.now() - 2 * 24 * 3600000, LIVE_FROM));
  const leads = await Query.find({
    createdAt: { $gte: since },
    email: { $nin: ["", null] },
    status: { $nin: ["Lost", "Won", "Not qualified"] },
  })
    .select("name businessName phone email remindersSent createdAt")
    .lean();

  for (const lead of leads) {
    if (hasKey(lead, "invite")) continue;
    try {
      const mail = buildLeadMail("invite", lead);
      if (!mail) continue;
      await sendLeadMail({ to: lead.email, subject: mail.subject, html: mail.html });
      await mark(lead, "invite", `${LABEL.invite} sent automatically to ${lead.email}`);
      sent.push({ lead: String(lead._id), key: "invite" });
    } catch (e) {
      skipped.push({ lead: String(lead._id), key: "invite", error: e?.message });
    }
  }
  return leads.length;
}

/* The reminder ladder for meetings still ahead. Meeting times are IST. */
async function reminders(sent, skipped) {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);

  const leads = await Query.find({
    meetingDate: { $gte: today },
    email: { $nin: ["", null] },
    held: { $in: ["", null] },
    status: { $nin: ["Lost", "Won"] },
  })
    .select("name email meetingDate meetingTime meetingMode remindersSent status")
    .lean();

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

    // Catching up (a cron that was down, or a meeting booked at short notice)
    // must not dump four mails on one lead: only the tightest rung goes out,
    // the rest are recorded as passed so they never fire late.
    const [send, ...passed] = due;
    try {
      const mail = buildLeadMail(send.k, lead);
      if (!mail) continue;
      await sendLeadMail({ to: lead.email, subject: mail.subject, html: mail.html });
      await mark(lead, send.k, `${LABEL[send.k] || send.n} sent automatically to ${lead.email}`);
      sent.push({ lead: String(lead._id), key: send.k });
    } catch (e) {
      // One bad address must not stop the run.
      skipped.push({ lead: String(lead._id), key: send.k, error: e?.message });
      continue;
    }
    if (passed.length) {
      await Query.findByIdAndUpdate(lead._id, {
        $push: { remindersSent: { $each: passed.map((p) => ({ key: p.k, at: new Date() })) } },
      }).catch(() => {});
    }
  }
  return leads.length;
}

/* After the meeting. Nothing goes out on a guess: the rep has to mark the
   meeting held or a no-show first, and then only one mail follows. A meeting
   left unmarked stays silent. */
async function afterMeeting(sent, skipped) {
  const now = Date.now();
  // Look back a week, so a meeting marked late still gets its mail.
  const from = new Date(now - 7 * 24 * 3600000).toISOString().slice(0, 10);
  const leads = await Query.find({
    meetingDate: { $gte: from },
    held: { $in: ["held", "noshow"] },
    email: { $nin: ["", null] },
  })
    .select("name businessName email meetingDate meetingTime meetingMode held remindersSent")
    .lean();

  for (const lead of leads) {
    const at = meetingAt(lead);
    // Give the call an hour to finish before anything lands.
    if (!at || now < at + 3600000) continue;

    const key = lead.held === "noshow" ? "noshow" : "material";
    if (hasKey(lead, key)) continue;
    try {
      const mail = buildLeadMail(key, lead);
      if (!mail) continue;
      await sendLeadMail({ to: lead.email, subject: mail.subject, html: mail.html });
      await mark(lead, key, `${LABEL[key]} sent automatically to ${lead.email}`);
      sent.push({ lead: String(lead._id), key });
    } catch (e) {
      skipped.push({ lead: String(lead._id), key, error: e?.message });
    }
  }
  return leads.length;
}

export async function runLeadAutomation() {
  await dbConnect();
  const sent = [];
  const skipped = [];
  const a = await autoReply(sent, skipped);
  const b = await reminders(sent, skipped);
  const c = await afterMeeting(sent, skipped);
  return { checked: a + b + c, sent, skipped };
}

/* The in-process clock. Started once per Node process; the interval keeps
   running even when nobody has the CRM open. */
const EVERY = 10 * 60 * 1000;
export function startLeadAutomation() {
  if (globalThis.__leadAutomation) return;
  globalThis.__leadAutomation = setInterval(() => {
    runLeadAutomation().catch((e) => console.error("lead automation:", e?.message));
  }, EVERY);
  // Give the server a moment to finish booting before the first pass.
  setTimeout(() => {
    runLeadAutomation().catch((e) => console.error("lead automation:", e?.message));
  }, 30000);
}
