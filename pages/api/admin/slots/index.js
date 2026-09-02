// pages/api/admin/slots/index.js — the call-slot schedule behind the website's
// booking form. The admin opens slots a month at a time; viralon-new lists the
// open ones and books them (shared Mongo "bookingslots" collection).
import dbConnect from "@/utils/dbConnect";
import BookingSlot from "@/models/BookingSlot";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

// Every date in "2026-09" whose weekday is in `days` (0=Sun … 6=Sat).
export function datesInMonth(month, days) {
  const [y, m] = month.split("-").map(Number);
  const out = [];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= last; d++) {
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (days.length && !days.includes(dt.getUTCDay())) continue;
    out.push(`${month}-${String(d).padStart(2, "0")}`);
  }
  return out;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const month = String(req.query.month || "");
      const filter = MONTH_RE.test(month) ? { date: { $regex: `^${month}-` } } : {};
      const slots = await BookingSlot.find(filter).sort({ date: 1, time: 1 }).lean();
      return res.status(200).json({ success: true, data: slots.map((s) => ({ ...s, id: s._id })) });
    }

    if (req.method === "POST") {
      const body = req.body || {};

      /* ── Bulk: open the same times on every chosen weekday of a month ── */
      if (body.mode === "bulk") {
        const month = String(body.month || "");
        if (!MONTH_RE.test(month)) {
          return res.status(400).json({ success: false, message: "Pick a month" });
        }
        const times = [...new Set((Array.isArray(body.times) ? body.times : []).map(String).filter((t) => TIME_RE.test(t)))].sort();
        if (!times.length) {
          return res.status(400).json({ success: false, message: "Add at least one time (HH:MM)" });
        }
        const days = (Array.isArray(body.days) ? body.days : [])
          .map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6);

        let dates = datesInMonth(month, days);
        // Don't open slots in the past — they'd only ever show as unavailable.
        if (body.skipPast !== false) {
          const today = new Date().toISOString().slice(0, 10);
          dates = dates.filter((d) => d >= today);
        }
        if (!dates.length) {
          return res.status(400).json({ success: false, message: "No upcoming dates match those weekdays" });
        }

        // insertMany with ordered:false — the unique date+time index makes
        // re-running this safe, duplicates are simply skipped.
        const docs = [];
        dates.forEach((date) => times.forEach((time) => docs.push({ date, time, status: "open" })));
        let added = 0;
        try {
          const r = await BookingSlot.insertMany(docs, { ordered: false });
          added = r.length;
        } catch (e) {
          added = e?.result?.result?.nInserted ?? e?.insertedDocs?.length ?? 0;
        }
        return res.status(201).json({
          success: true,
          added,
          skipped: docs.length - added,
          message: `${added} slot${added === 1 ? "" : "s"} opened${docs.length - added ? `, ${docs.length - added} already existed` : ""}`,
        });
      }

      /* ── Single slot ── */
      const date = String(body.date || "");
      const time = String(body.time || "");
      if (!DATE_RE.test(date)) return res.status(400).json({ success: false, message: "Pick a valid date" });
      if (!TIME_RE.test(time)) return res.status(400).json({ success: false, message: "Time must be HH:MM" });

      const clash = await BookingSlot.findOne({ date, time }).lean();
      if (clash) return res.status(400).json({ success: false, message: "That slot already exists" });

      const created = await BookingSlot.create({ date, time, status: "open" });
      return res.status(201).json({ success: true, data: created });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
