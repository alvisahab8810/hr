// pages/api/admin/leads/import.js — bulk import behind Website → Leads → Import.
//
// The browser reads the .xlsx/.csv (utils/leadsImport.js) and posts the rows
// it parsed; this end does the part the browser cannot be trusted with —
// validating each row, refusing the ones that would dirty the board, and
// checking every row against the leads already in Mongo so an import can be
// run twice without doubling the list.
//
// Nothing is written until the whole file has been checked: a row that fails
// is reported with its spreadsheet line number and the rest still go in.
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import Salesperson from "@/models/Salesperson";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { salesId } from "@/utils/salesAuth";
import { MANUAL_STATUSES } from "@/utils/leadsMeta";

// A file of a few thousand rows is well past Next's 1mb default.
export const config = { api: { bodyParser: { sizeLimit: "8mb" } } };

const MAX_ROWS = 5000;

// "+91 98765-43210" → "9876543210"; a leading 91/0 is dropped so the same
// person typed three ways still reads as one number.
const digits = (v) => {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
};

const str = (v) => String(v ?? "").trim();

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    // "skip" leaves an existing lead alone; "add" imports it anyway, which is
    // what the team wants when two people really do share a landline.
    const onDupe = req.body?.onDupe === "add" ? "add" : "skip";

    if (!rows.length) {
      return res.status(400).json({ success: false, message: "The sheet has no rows to import" });
    }
    if (rows.length > MAX_ROWS) {
      return res.status(400).json({
        success: false,
        message: `That is ${rows.length} rows — import up to ${MAX_ROWS} at a time.`,
      });
    }

    const mySales = salesId(req);
    // Only the statuses a human picks. Where the CRM has put a lead is its own
    // field now, and a spreadsheet cannot prove a meeting happened or that
    // money came in, so anything else in the sheet lands as New.
    const statuses = MANUAL_STATUSES;

    // "Assign to" is typed as a name or an email, so the team list is read
    // once and matched on both.
    const reps = mySales ? [] : await Salesperson.find({ active: true }).select("name email").lean().catch(() => []);
    const repBy = new Map();
    reps.forEach((r) => {
      if (r.name) repBy.set(str(r.name).toLowerCase(), String(r._id));
      if (r.email) repBy.set(str(r.email).toLowerCase(), String(r._id));
    });

    /* ── 1. validate, and remember what each row would clash on ───────────── */
    const errors = [];
    const clean = [];

    rows.forEach((r, i) => {
      const line = r?._row || i + 2;
      const name = str(r?.name);
      if (!name) { errors.push({ line, message: "No name — row skipped" }); return; }

      const email = str(r?.email).toLowerCase();
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        errors.push({ line, message: `"${email}" is not an email — row skipped` });
        return;
      }

      const phone = digits(r?.phone);
      if (str(r?.phone) && phone.length !== 10) {
        errors.push({ line, message: `"${str(r.phone)}" is not a 10-digit phone — row skipped` });
        return;
      }

      const asked  = str(r?.status);
      const status = statuses.includes(asked) ? asked : "New";
      const owner  = mySales || repBy.get(str(r?.owner).toLowerCase()) || null;

      const custom = {};
      Object.entries(r?.customFields || {}).forEach(([k, v]) => {
        if (str(v)) custom[k] = str(v);
      });

      clean.push({
        line,
        email,
        phone,
        doc: {
          name,
          email,
          phone,
          businessName: str(r?.businessName),
          formType: "Imported",
          budget: str(r?.budget),
          runningAds: str(r?.runningAds),
          status,
          city: str(r?.city),
          industry: str(r?.industry),
          service: str(r?.service),
          website: str(r?.website),
          instagram: str(r?.instagram),
          notes: str(r?.notes),
          salespersonId: owner,
          source: {
            utmSource:   str(r?.source?.utmSource),
            utmMedium:   str(r?.source?.utmMedium),
            utmCampaign: str(r?.source?.utmCampaign),
            utmTerm:     str(r?.source?.utmTerm),
            utmContent:  str(r?.source?.utmContent),
            campaignId:  str(r?.source?.campaignId),
            adset:       str(r?.source?.adset),
            adName:      str(r?.source?.adName),
            gclid:       "",
            fbclid:      "",
            landingPage: "",
            referrer:    "",
          },
          customFields: custom,
          events: [{ at: new Date(), type: "created", text: "Lead imported from a spreadsheet" }],
        },
      });
    });

    if (!clean.length) {
      return res.status(200).json({ success: true, created: 0, duplicates: 0, errors });
    }

    /* ── 2. the duplicates: against the board, and within the file ────────── */
    let dupes = [];
    const seenEmail = new Set();
    const seenPhone = new Set();
    let keep = clean;

    if (onDupe === "skip") {
      const emails = [...new Set(clean.map((c) => c.email).filter(Boolean))];
      const phones = [...new Set(clean.map((c) => c.phone).filter(Boolean))];

      // One query for the lot — a row-by-row findOne would be thousands of
      // round trips. Phones are stored three ways, so all three are asked for.
      const existing = await Query.find({
        $or: [
          ...(emails.length ? [{ email: { $in: emails } }] : []),
          ...(phones.length ? [{ phone: { $in: phones.flatMap((p) => [p, `+91${p}`, `91${p}`]) } }] : []),
        ],
      }).select("email phone").lean();

      const hasEmail = new Set(existing.map((e) => str(e.email).toLowerCase()).filter(Boolean));
      const hasPhone = new Set(existing.map((e) => digits(e.phone)).filter(Boolean));

      keep = clean.filter((c) => {
        const dupeInDb   = (c.email && hasEmail.has(c.email)) || (c.phone && hasPhone.has(c.phone));
        const dupeInFile = (c.email && seenEmail.has(c.email)) || (c.phone && seenPhone.has(c.phone));
        if (dupeInDb || dupeInFile) {
          dupes.push({ line: c.line, name: c.doc.name, where: dupeInDb ? "already in the list" : "repeated in the file" });
          return false;
        }
        if (c.email) seenEmail.add(c.email);
        if (c.phone) seenPhone.add(c.phone);
        return true;
      });
    }

    /* ── 3. write ─────────────────────────────────────────────────────────── */
    let created = 0;
    if (keep.length) {
      // `ordered: false` so one bad row cannot stop the ones behind it.
      const done = await Query.insertMany(keep.map((c) => c.doc), { ordered: false }).catch((e) => {
        (e?.writeErrors || []).forEach((we) => {
          errors.push({ line: keep[we.index]?.line, message: we.errmsg || "Mongo refused this row" });
        });
        return e?.insertedDocs || [];
      });
      created = done.length;
    }

    return res.status(200).json({
      success: true,
      created,
      duplicates: dupes.length,
      dupeRows: dupes.slice(0, 50),
      errors: errors.slice(0, 50),
      errorCount: errors.length,
    });
  } catch (error) {
    console.error("leads import:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
