// utils/invoiceAutomation.js — the invoice mails that go out without anyone
// clicking Send.
//
// The whole thing is one setting, edited once in Finance → Invoice sender and
// then left alone (pages/api/admin/settings.js, the `billing` section). Every
// pass does three things, in this order:
//
//   1. overdue()   — a sent invoice past its due date is marked Overdue, so the
//                    boards and the reminder ladder agree on what is late.
//   2. firstSend() — a freshly raised invoice is mailed to the client once.
//   3. chase()     — the due-date ladder: a few days before, on the day, and
//                    then a chase every N days until it is paid or the limit
//                    is reached.
//
// Nothing is mailed twice: every rung is recorded on the invoice itself
// (invoice.mailsSent), the same way a lead records its reminders. A pass that
// catches up after the server was down therefore sends the one rung that is
// still true, not the four it missed.
//
// It runs on a timer inside the Node process (startInvoiceAutomation) and from
// /api/cron/invoice-automation, so an external cron is a backup rather than the
// only trigger — exactly the arrangement utils/leadAutomation.js uses.
import dbConnect from "@/utils/dbConnect";
import Invoice from "@/models/Invoice";
import Query from "@/models/Query";
import { getSettings } from "@/pages/api/admin/settings";
import { sendScheduledInvoice, sendInvoiceReminder, rungLabel, invoiceLeft } from "@/utils/invoiceMail";

// Invoices carry plain "YYYY-MM-DD" dates meant in IST, so the day has to be
// counted in IST too — at 02:00 IST a UTC date is still yesterday and every
// "due today" would be a day out.
const IST = 5.5 * 3600000;
export const istDay = (ms = Date.now()) => new Date(ms + IST).toISOString().slice(0, 10);
export const istMinutes = (ms = Date.now()) => {
  const d = new Date(ms + IST);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
};
export const istWeekday = (ms = Date.now()) => new Date(ms + IST).getUTCDay();
// Signed days from today to a date: +2 is two days ahead, -3 three days past.
export const daysTo = (date, from = istDay()) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

// Nothing raised before this day is ever mailed: switching the sender on must
// not fire a year of reminders at every client who ever had an invoice. It is
// the invoice's own age that decides, not its due date — an invoice raised
// since the sender went live is chased however late it has become, while one
// from the old days is left to whoever was already chasing it by hand.
const LIVE_FROM = new Date("2026-10-01T00:00:00+05:30");

const SETTLED = ["Paid", "Cancelled"];
const hasKey = (inv, k) => (inv.mailsSent || []).some((r) => r.key === k);
// One mail per invoice per day, whatever the reason. An invoice raised on the
// day it falls due would otherwise get its first copy and a "due today" chase
// in the same pass, which reads to the client like a dunning letter on day one.
const mailedToday = (inv, today) =>
  (inv.mailsSent || []).some((r) => r.at && istDay(new Date(r.at).getTime()) === today);

/* Is the sender allowed to mail at this moment? The time is the one promise the
   setting makes — "set it once and the mails go at that time" — so a pass that
   lands before it does nothing but wait for the next one. */
export function windowOpen(b, now = Date.now()) {
  const days = Array.isArray(b.sendDays) && b.sendDays.length ? b.sendDays : [0, 1, 2, 3, 4, 5, 6];
  if (!days.map(Number).includes(istWeekday(now))) return false;
  const at = Number(b.sendHour || 0) * 60 + Number(b.sendMinute || 0);
  return istMinutes(now) >= at;
}

/* When the next run is due, for the dashboard to print. */
export function nextRunAt(b, now = Date.now()) {
  const days = Array.isArray(b.sendDays) && b.sendDays.length ? b.sendDays.map(Number) : [0, 1, 2, 3, 4, 5, 6];
  const at = Number(b.sendHour || 0) * 60 + Number(b.sendMinute || 0);
  for (let i = 0; i < 8; i += 1) {
    const ms = now + i * 86400000;
    if (!days.includes(istWeekday(ms))) continue;
    if (i === 0 && istMinutes(now) >= at) continue;   // today's slot has gone
    return `${istDay(ms)} ${String(Number(b.sendHour || 0)).padStart(2, "0")}:${String(Number(b.sendMinute || 0)).padStart(2, "0")} IST`;
  }
  return "";
}

/* Which rung, if any, is true for this invoice right now. One answer only: the
   ladder is walked from the tightest rung outwards so an invoice that is both
   "3 days before" and "due today" can never be read as the earlier one. */
export function dueRung(inv, b, today = istDay()) {
  if (!inv.due || !b.dueReminders) return null;
  const d = daysTo(inv.due, today);

  if (d < 0) {
    const every = Math.max(1, Number(b.afterEvery || 7));
    const max = Math.max(0, Number(b.afterMax || 0));
    if (!max) return null;
    // Only the chases that have actually come round, newest first.
    for (let n = max; n >= 1; n -= 1) {
      const late = n * every;
      if (-d >= late) return { key: `due-a${late}`, days: -late };
    }
    return null;
  }

  if (d === 0) return b.onDue ? { key: "due-0", days: 0 } : null;

  const before = (Array.isArray(b.beforeDays) ? b.beforeDays : [])
    .map(Number).filter((x) => x > 0).sort((a, c) => a - c);
  for (const x of before) if (d <= x) return { key: `due-b${x}`, days: d };
  return null;
}

async function mark(inv, key, text) {
  await Invoice.findByIdAndUpdate(inv._id, {
    $push: { mailsSent: { key, at: new Date() } },
  }).catch(() => {});
  if (inv.leadId) {
    await Query.findByIdAndUpdate(inv.leadId, {
      $push: { events: { at: new Date(), type: "invoice", text } },
    }).catch(() => {});
  }
}

/* A sent invoice whose due date has gone is Overdue. It is stored rather than
   derived here because the reminder ladder, the dashboard and the boards all
   have to agree, and a status the client can be mailed about should be real. */
async function overdue() {
  const today = istDay();
  const r = await Invoice.updateMany(
    { status: "Sent", due: { $nin: ["", null], $lt: today } },
    { $set: { status: "Overdue" } }
  );
  return r?.modifiedCount || 0;
}

/* The first copy of a newly raised invoice. Only a Draft is sent — anything
   already Sent went out from the compose box, and a paid one is finished. */
async function firstSend(b, sent, skipped) {
  if (!b.autoSend) return 0;
  const today = istDay();
  const list = await Invoice.find({
    status: "Draft",
    em: { $nin: ["", null] },
    // A bill already under dispute is not worth mailing out in the first place.
    disputed: { $ne: true },
    createdAt: { $gte: LIVE_FROM },
    // A future-dated invoice waits for its own day to come round.
    issued: { $nin: ["", null], $lte: today },
  }).lean();

  for (const inv of list) {
    if (hasKey(inv, "invoice")) continue;
    try {
      await sendScheduledInvoice(inv, { cc: b.cc || "" });
      await Invoice.findByIdAndUpdate(inv._id, { $set: { status: "Sent" } }).catch(() => {});
      await mark(inv, "invoice", `Invoice mailed automatically to ${inv.em}`);
      sent.push({ invoice: String(inv._id), key: "invoice", to: inv.em });
    } catch (e) {
      // One bad address must not stop the run.
      skipped.push({ invoice: String(inv._id), key: "invoice", error: e?.message });
    }
  }
  return list.length;
}

/* The due-date ladder. Anything with money still owing and a due date on it. */
async function chase(b, sent, skipped) {
  if (!b.dueReminders) return 0;
  const today = istDay();
  const list = await Invoice.find({
    status: { $nin: SETTLED.concat("Draft") },
    em: { $nin: ["", null] },
    // The dispute hold. Nothing is chased while it is on, however late it gets.
    disputed: { $ne: true },
    createdAt: { $gte: LIVE_FROM },
    due: { $nin: ["", null] },
  }).lean();

  for (const inv of list) {
    if (invoiceLeft(inv) <= 0) continue;          // settled in all but status
    if (mailedToday(inv, today)) continue;
    const rung = dueRung(inv, b, today);
    if (!rung || hasKey(inv, rung.key)) continue;
    try {
      await sendInvoiceReminder(inv, rung.days, { cc: b.cc || "" });
      await mark(inv, rung.key, `${rungLabel(rung.key)} — mailed automatically to ${inv.em}`);
      sent.push({ invoice: String(inv._id), key: rung.key, to: inv.em });
    } catch (e) {
      skipped.push({ invoice: String(inv._id), key: rung.key, error: e?.message });
    }
  }
  return list.length;
}

/* One pass. `force` is the Run now button on the sender screen: it ignores the
   time window, because somebody is standing there asking for it. */
export async function runInvoiceAutomation({ force = false } = {}) {
  await dbConnect();
  const b = (await getSettings()).billing || {};
  const marked = await overdue();

  if (!force && !windowOpen(b)) {
    return { ran: false, reason: "Outside the sending window", marked, next: nextRunAt(b), sent: [], skipped: [] };
  }

  const sent = [];
  const skipped = [];
  const a = await firstSend(b, sent, skipped);
  const c = await chase(b, sent, skipped);
  return { ran: true, checked: a + c, marked, next: nextRunAt(b), sent, skipped };
}

/* The in-process clock, started once per Node process. Twenty minutes is close
   enough: the window is a time of day, not a minute. */
const EVERY = 20 * 60 * 1000;
export function startInvoiceAutomation() {
  if (globalThis.__invoiceAutomation) return;
  globalThis.__invoiceAutomation = setInterval(() => {
    runInvoiceAutomation().catch((e) => console.error("invoice automation:", e?.message));
  }, EVERY);
  setTimeout(() => {
    runInvoiceAutomation().catch((e) => console.error("invoice automation:", e?.message));
  }, 45000);
}

/* When the next automatic mail for this one invoice is due, for the board to
   print beside it. It does not invert the ladder — it walks the days forward
   asking dueRung the same question chase() asks of today, so what the table
   promises and what the sender actually does can never drift apart. */
export function nextInvoiceMail(inv, b, today = istDay()) {
  if (!inv || !b) return null;
  if (inv.disputed) return { on: "", key: "hold", label: "On hold — disputed" };
  if (SETTLED.includes(inv.status)) return null;
  if (inv.createdAt && new Date(inv.createdAt) < LIVE_FROM) return null;

  // The first copy of a Draft, which may still be waiting for its issue date.
  if (inv.status === "Draft") {
    if (!b.autoSend || hasKey(inv, "invoice")) return null;
    const ahead = inv.issued ? daysTo(inv.issued, today) : 0;
    return { on: ahead > 0 ? inv.issued : today, key: "invoice", label: rungLabel("invoice") };
  }

  if (!b.dueReminders || !inv.due) return null;
  if (invoiceLeft(inv) <= 0) return null;

  const every = Math.max(1, Number(b.afterEvery || 7));
  const max = Math.max(0, Number(b.afterMax || 0));
  // Far enough to cover the last chase the ladder will ever send, no further.
  const span = Math.min(730, Math.max(0, daysTo(inv.due, today)) + every * max + 1);
  const dayAt = (n) => new Date(Date.parse(`${today}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

  for (let n = 0; n <= span; n += 1) {
    if (n === 0 && mailedToday(inv, today)) continue;
    const rung = dueRung(inv, b, dayAt(n));
    if (!rung || hasKey(inv, rung.key)) continue;
    return { on: dayAt(n), key: rung.key, label: rungLabel(rung.key), days: rung.days };
  }
  return null;
}
