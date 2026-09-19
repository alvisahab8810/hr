// pages/api/admin/newsletter/index.js — the subscriber list behind
// Website → Newsletter.
//
// Addresses land here from the website footer (viralon-new writes into the
// shared "newsletters" collection); the team can also add one by hand, and
// export the whole list as CSV for whatever sends the actual mail.
import dbConnect from "@/utils/dbConnect";
import Newsletter from "@/models/Newsletter";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const str = (v) => String(v ?? "").trim();

/* Excel reads a CSV cell starting with = + - @ as a formula, so those get a
   leading quote. The rest is ordinary quoting. */
const csvCell = (v) => {
  const s = String(v ?? "");
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    /* ── GET: the whole list, or a CSV of it ───────────────────────────── */
    if (req.method === "GET") {
      const rows = await Newsletter.find({}).sort({ createdAt: -1 }).lean();

      if (str(req.query.format).toLowerCase() === "csv") {
        // Export what was asked for: everyone, or only the live subscribers.
        const wanted =
          str(req.query.status) === "subscribed"
            ? rows.filter((r) => r.status === "subscribed")
            : str(req.query.status) === "unsubscribed"
            ? rows.filter((r) => r.status === "unsubscribed")
            : rows;

        const head = ["Email", "Status", "Source", "Page", "Campaign", "Notes", "Subscribed on"];
        const body = wanted.map((r) =>
          [
            r.email,
            r.status,
            r.channel || "",
            r.source?.page || "",
            r.source?.utmCampaign || "",
            r.notes || "",
            r.subscribedAt ? new Date(r.subscribedAt).toISOString().slice(0, 10) : "",
          ].map(csvCell).join(",")
        );

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`
        );
        // The BOM is what makes Excel open a UTF-8 CSV without mangling it.
        return res.status(200).send("\uFEFF" + [head.map(csvCell).join(","), ...body].join("\r\n"));
      }

      return res.status(200).json({
        success: true,
        data: rows.map((r) => ({ ...r, _id: String(r._id) })),
      });
    }

    /* ── POST: add an address by hand ──────────────────────────────────── */
    if (req.method === "POST") {
      const email = str(req.body?.email).toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address" });
      }

      const existing = await Newsletter.findOne({ email });
      if (existing) {
        return res.status(400).json({
          success: false,
          message:
            existing.status === "subscribed"
              ? "That address is already on the list"
              : "That address is on the list as unsubscribed — resubscribe it instead",
        });
      }

      const created = await Newsletter.create({
        email,
        status: "subscribed",
        // Typed in by the team, not signed up on the website — worth knowing
        // when someone asks where an address came from.
        channel: "manual",
        notes: str(req.body?.notes),
        subscribedAt: new Date(),
      });

      return res.status(201).json({ success: true, data: { ...created.toObject(), _id: String(created._id) } });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: "That address is already on the list" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}
