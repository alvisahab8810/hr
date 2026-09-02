// pages/api/admin/settings.js — the CRM's configuration, read by every board.
// GET merges the saved row over the built-in defaults so a fresh install still
// answers with a full object; PUT saves a patch. Nothing else writes here.
import dbConnect from "@/utils/dbConnect";
import Setting from "@/models/Setting";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { readSales } from "@/utils/salesAuth";
import { SOURCES, SERVICES, INDUSTRIES, BUDGETS, LOST_REASONS } from "@/utils/leadsMeta";

export const DEFAULTS = {
  lists: {
    sources: SOURCES,
    services: SERVICES,
    industries: INDUSTRIES,
    budgets: BUDGETS,
    lostReasons: LOST_REASONS,
  },
  company: {
    name: "Viralon",
    tag: "Digital marketing, built to perform",
    email: "info@viralon.in",
    site: "www.viralon.in",
    place: "Pune, Maharashtra",
    gstin: "",
    pan: "",
    bank: "",
    ifsc: "",
    upi: "",
  },
  docs: {
    gstPct: 18,
    dueDays: 10,
    terms: [
      "Payment is due by the date on this document unless agreed otherwise in writing.",
      "Overdue amounts carry a late fee of 2% per month.",
      "Work outside the agreed scope is quoted and billed separately.",
      "Timelines start once content, approvals and the advance are received.",
      "Deliverables transfer on full payment; Viralon may show the work in its portfolio.",
      "Disputes are settled amicably; jurisdiction is Pune, Maharashtra.",
    ],
  },
};

// A shallow merge per section is enough: every section is a flat object of
// scalars or arrays, and a saved list replaces the default outright.
function merge(saved = {}) {
  const out = {};
  for (const k of Object.keys(DEFAULTS)) out[k] = { ...DEFAULTS[k], ...(saved[k] || {}) };
  return out;
}

export async function getSettings() {
  await dbConnect();
  const row = await Setting.findOne({ key: "crm" }).lean();
  return merge(row?.data || {});
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      return res.status(200).json({ success: true, data: await getSettings() });
    }

    if (req.method === "PUT") {
      // Salespeople read the settings so their dropdowns are right; only the
      // admin gets to change them.
      if (readSales(req.headers.cookie || "")) {
        return res.status(403).json({ success: false, message: "Only an admin can change the settings" });
      }
      const patch = req.body || {};
      const row = await Setting.findOne({ key: "crm" });
      const data = { ...(row?.data || {}) };
      // Only the known sections are writable, so a stray key cannot poison the row.
      for (const k of Object.keys(DEFAULTS)) {
        if (patch[k] && typeof patch[k] === "object") data[k] = { ...(data[k] || {}), ...patch[k] };
      }
      await Setting.findOneAndUpdate({ key: "crm" }, { key: "crm", data }, { upsert: true });
      return res.status(200).json({ success: true, data: merge(data) });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("settings api:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
