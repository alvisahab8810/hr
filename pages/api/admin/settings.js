// pages/api/admin/settings.js — the CRM's configuration, read by every board.
// GET merges the saved row over the built-in defaults so a fresh install still
// answers with a full object; PUT saves a patch. Nothing else writes here.
import dbConnect from "@/utils/dbConnect";
import Setting from "@/models/Setting";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { readSales } from "@/utils/salesAuth";
import { SOURCES, SERVICES, INDUSTRIES, BUDGETS, RUNNING_ADS, LOST_REASONS } from "@/utils/leadsMeta";

export const DEFAULTS = {
  lists: {
    sources: SOURCES,
    services: SERVICES,
    industries: INDUSTRIES,
    budgets: BUDGETS,
    runningAds: RUNNING_ADS,
    lostReasons: LOST_REASONS,
  },
  // The invoice prints a registered business, not a brand: the tax sheet asks
  // for the legal name, the registered address, the trade name and a phone, and
  // it signs off in somebody's capacity. None of that existed here, so the PDF
  // could not be a GST tax invoice however it was laid out. The bank block is
  // left blank on purpose -- account numbers belong in the database the admin
  // fills in, not in a file that is committed.
  company: {
    name: "Viralon",
    legalName: "Viralon Digital Services LLP",
    tradeName: "Viralon",
    tag: "Digital marketing, built to perform",
    email: "info@viralon.in",
    site: "www.viralon.in",
    // The registered details print on every tax invoice, so they are the
    // defaults rather than blanks waiting for somebody to fill them in.
    phone: "9305451301",
    address: "GF, Unit no.-1, Tower 2, Parsvnath Planet, Gomti Nagar, Lucknow-226010",
    place: "Lucknow, Uttar Pradesh",
    state: "Uttar Pradesh",
    gstin: "09AAVFV6664JIZ3",
    pan: "",
    bank: "",
    bankName: "",
    accountName: "",
    accountNo: "",
    ifsc: "",
    upi: "",
    qr: "",            // an image the admin pastes in: the UPI code to scan
    signatory: "PARTNER",
  },
  // The invoice sender, set once in Finance -> Invoice sender and then left
  // alone: the pass in utils/invoiceAutomation.js reads nothing else.
  billing: {
    autoSend: false,       // mail a new invoice by itself once it is raised
    sendHour: 10,          // IST hour the day's run is allowed to mail from
    sendMinute: 0,
    sendDays: [1, 2, 3, 4, 5],  // 0 = Sunday. Nothing goes out on a day left off
    dueReminders: true,
    beforeDays: [3, 1],    // reminders this many days ahead of the due date
    onDue: true,           // and one on the due date itself
    afterEvery: 7,         // then a chase every N days while it stays unpaid
    afterMax: 4,           // stopping after this many chases
    cc: "",                // accounts copy, on every mail the sender sends
  },
  docs: {
    gstPct: 18,
    dueDays: 10,
    // What the invoice serial is raised under: VIR/26-27/001. It is a setting
    // and not a constant because the numbers already issued must not move if
    // the business ever bills under a different mark.
    invPrefix: "VIR",
    // The invoice carries its own terms. A bill asks for money by a date and
    // says how it may be paid, which is not what a proposal's six lines about
    // scope and jurisdiction are for, so the two lists are kept apart.
    invTerms: [
      "100% advance payment at the 25th to 30th of each month.",
      "Payment mode - UPI, Bank Transfer, Paypal (as applicable), NO CASH PAYMENT",
      "A late fee of 5% will be applicable for payment delayed beyond the due date",
    ],
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
