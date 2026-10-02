// utils/leadsImport.js — the sheet shape behind Website → Leads → Import.
//
// One list of columns, shared by three places: the .xlsx template the team
// downloads, the parser that reads the file they send back, and the API that
// writes the leads. Keeping it in one place is what makes "export, edit,
// import again" work — the labels here are the Export column names.
//
// Anything the team added as a column of its own (models/LeadField) is matched
// by its label on top of these, so those come back too.

export const IMPORT_COLS = [
  { f: "name",         n: "Name",          req: true, eg: "Anita Rao",
    alias: ["fullname", "leadname", "contactname", "person"] },
  { f: "businessName", n: "Business Name", eg: "Rao Interiors",
    alias: ["company", "business", "companyname", "brand", "organisation", "organization"] },
  { f: "phone",        n: "Phone",         eg: "9876543210",
    alias: ["mobile", "contact", "contactnumber", "phonenumber", "whatsapp"] },
  { f: "email",        n: "Email",         eg: "anita@raointeriors.in",
    alias: ["emailaddress", "mail", "emailid"] },
  { f: "city",         n: "City",          eg: "Indore",
    alias: ["town", "location"] },
  { f: "industry",     n: "Industry",      eg: "Real Estate",
    alias: ["sector", "category", "vertical"] },
  { f: "service",      n: "Service",       eg: "Performance Marketing",
    alias: ["interestedin", "requirement", "serviceneeded"] },
  { f: "runningAds",   n: "Running ads",   eg: "Not yet",
    alias: ["ads", "runningads", "adsstatus"] },
  { f: "budget",       n: "Budget",        eg: "₹50,000 - ₹1,00,000",
    alias: ["monthlybudget", "spend"] },
  { f: "status",       n: "Status",        eg: "New",
    alias: ["leadstatus", "stage"] },
  { f: "owner",        n: "Assign to",     eg: "",
    alias: ["owner", "salesperson", "assignedto", "assignee", "rep"] },
  { f: "website",      n: "Website",       eg: "raointeriors.in",
    alias: ["site", "url", "weburl"] },
  { f: "instagram",    n: "Instagram",     eg: "@raointeriors",
    alias: ["ig", "instahandle", "instagramhandle"] },
  { f: "notes",        n: "Notes",         eg: "Called once, asked to ring back Monday",
    alias: ["note", "remark", "remarks", "comment", "comments"] },

  /* Where it came from — the same attribution the website writes. */
  { f: "src.utmSource",   n: "Source",      eg: "Google Ads",
    alias: ["leadsource", "utmsource", "channel"] },
  { f: "src.utmCampaign", n: "Campaign",    eg: "Interiors-Indore",
    alias: ["utmcampaign", "campaignname"] },
  { f: "src.campaignId",  n: "Campaign ID", eg: "",
    alias: ["utmcampaignid", "campid"] },
  { f: "src.adset",       n: "Ad set",      eg: "",
    alias: ["adgroup", "adsetname"] },
  { f: "src.adName",      n: "Ad name",     eg: "",
    alias: ["ad", "creative", "adtitle"] },
  { f: "src.utmContent",  n: "Content",     eg: "",
    alias: ["utmcontent"] },
];

// Headers are typed by hand in Excel, so match on letters and digits only:
// "Business  Name", "business_name" and "BusinessName" are all one column.
export const headKey = (v) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/* A header → where its value belongs. Custom columns are matched by their
   label, and they lose to a built-in column of the same name. */
export function buildHeaderMap(headers, fields = []) {
  const base = new Map();
  IMPORT_COLS.forEach((c) => {
    base.set(headKey(c.n), c.f);
    (c.alias || []).forEach((a) => { if (!base.has(a)) base.set(a, c.f); });
  });

  const custom = new Map();
  (fields || []).forEach((f) => custom.set(headKey(f.label), f.key));

  const out = [];
  headers.forEach((h, i) => {
    const k = headKey(h);
    if (!k) return;
    if (base.has(k)) out.push({ i, f: base.get(k) });
    else if (custom.has(k)) out.push({ i, cf: custom.get(k) });
    // Anything else — Lead ID, Created, Connects — is export-only noise and
    // is simply left on the floor.
  });
  return out;
}

const cell = (v) => (v === null || v === undefined ? "" : String(v).trim());

/* A sheet, as rows of cells, turned into lead-shaped objects. `rows[0]` is
   the header row. Blank lines are dropped rather than imported as empties. */
export function parseSheet(rows, fields = []) {
  const head = rows[0] || [];
  const map = buildHeaderMap(head, fields);
  const out = [];

  rows.slice(1).forEach((r, n) => {
    if (!r || !r.some((v) => cell(v))) return;

    const lead = { customFields: {} };
    map.forEach(({ i, f, cf }) => {
      const v = cell(r[i]);
      if (!v) return;
      if (cf) lead.customFields[cf] = v;
      else if (f.startsWith("src.")) {
        lead.source = lead.source || {};
        lead.source[f.slice(4)] = v;
      } else lead[f] = v;
    });

    // The spreadsheet row number, so an error can be pointed at a line.
    lead._row = n + 2;
    out.push(lead);
  });

  return out;
}

/* The template: the header row, then one filled-in row showing the format. */
export function templateRows(fields = []) {
  const head = [...IMPORT_COLS.map((c) => c.n), ...(fields || []).map((f) => f.label)];
  const eg   = [...IMPORT_COLS.map((c) => c.eg || ""), ...(fields || []).map(() => "")];
  return [head, eg];
}
