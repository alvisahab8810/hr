// utils/leadsMeta.js — the vocabulary of the Leads board: statuses, the stage
// rail, the reminder ladder, the prep checklist, the scoring questions and the
// column list. Kept out of the page so the page stays about layout.

/* ── Where a lead is ──────────────────────────────────────────────────────── */
export const STATUSES = [
  { k: "New",               stage: 1, bg: "#F1F5F9", fg: "#475569", bd: "#E2E8F0" },
  { k: "Contacted",         stage: 2, bg: "#E0F2FE", fg: "#0369A1", bd: "#BAE6FD" },
  { k: "Meeting booked",    stage: 3, bg: "#EEF2FF", fg: "#4F46E5", bd: "#C7D2FE" },
  { k: "Consultation done", stage: 4, bg: "#E0E7FF", fg: "#4338CA", bd: "#C7D2FE" },
  { k: "Qualified",         stage: 5, bg: "#DCFCE7", fg: "#15803D", bd: "#BBF7D0" },
  { k: "Proposal sent",     stage: 6, bg: "#FFEDD5", fg: "#C2410C", bd: "#FED7AA" },
  { k: "Negotiation",       stage: 7, bg: "#FFF7ED", fg: "#EA580C", bd: "#FED7AA" },
  { k: "Won",               stage: 8, bg: "#DCFCE7", fg: "#15803D", bd: "#BBF7D0" },
  { k: "NPC",               stage: 2, bg: "#FEF3C7", fg: "#B45309", bd: "#FDE68A" },
  { k: "Not qualified",     stage: 9, bg: "#FEE2E2", fg: "#B91C1C", bd: "#FECACA" },
  { k: "Lost",              stage: 9, bg: "#FEE2E2", fg: "#B91C1C", bd: "#FECACA" },
];

/* The only statuses a human picks. Everything else on the list above is set by
   the CRM itself (a booked meeting, a sent proposal, a paid invoice), so it is
   shown when a lead is already there but never offered in the dropdown. */
export const MANUAL_STATUSES = ["New", "Contacted", "Qualified", "Not qualified"];

// The dropdown for one lead is always just the four manual choices. Where the
// automation has put the lead is carried by a hidden option, so the closed
// select still reads "Consultation done" without offering it as a choice.
export const statusOptions = () => MANUAL_STATUSES;
export const isManualStatus = (k) => !k || MANUAL_STATUSES.includes(k);

export const statusMeta = (k) =>
  STATUSES.find((s) => s.k === k) || STATUSES[0];

/* ── The pipeline rail above the table ────────────────────────────────────── */
export const RAIL = [
  { k: "all",    n: "All leads",      m: () => true },
  { k: "nobook", n: "No meeting yet", m: (l) => !l.meetingDate && !["Won", "Lost", "Not qualified"].includes(l.status) },
  { k: "new",    n: "New",            m: (l) => l.status === "New" },
  { k: "cont",   n: "Contacted",      m: (l) => l.status === "Contacted" || l.status === "NPC" },
  { k: "booked", n: "Meeting booked", m: (l) => l.status === "Meeting booked" },
  { k: "cons",   n: "Consulted",      m: (l) => l.status === "Consultation done" || l.status === "Qualified" },
  { k: "prop",   n: "Proposal",       m: (l) => l.status === "Proposal sent" },
  { k: "won",    n: "Won",            m: (l) => l.status === "Won" },
  { k: "drop",   n: "Dropped",        m: (l) => l.status === "Lost" || l.status === "Not qualified" },
];

/* ── Picklists ────────────────────────────────────────────────────────────── */
// Must stay word-for-word what the website form offers, or the budget column
// reads differently for form leads and hand-added ones.
export const BUDGETS = [
  "Under ₹25,000",
  "₹25,000 to ₹75,000",
  "₹75,000 to ₹2,00,000",
  "Above ₹2,00,000",
];

export const SERVICES = [
  "Performance Marketing", "Social Media Marketing", "SEO",
  "Website Development", "Branding & Design", "Video Production",
  "Influencer Marketing", "Other",
];

export const INDUSTRIES = [
  "D2C / E-commerce", "Real Estate", "Healthcare", "Education", "Food & Beverage",
  "Fashion & Apparel", "Fitness & Wellness", "Travel & Hospitality",
  "Automotive", "Finance", "Manufacturing", "Professional Services", "Other",
];

export const SOURCES = [
  "Website form", "Google Ads", "Meta Ads", "Referral", "Instagram",
  "LinkedIn", "Cold call", "Walk-in", "Other",
];

export const LOST_REASONS = [
  "Budget too low", "Went with a competitor", "Doing it in-house",
  "Timing not right", "Never responded again", "Not a fit for us",
];

/* ── How the meeting will happen ──────────────────────────────────────────────
   Nothing is booked from the website any more: the team rings the lead, agrees
   one of these, and writes the date and time in by hand. */
export const MEETING_MODES = [
  { k: "Google Meet", icon: "bi-camera-video-fill", bg: "#EEF2FF", fg: "#4F46E5", needs: "link" },
  { k: "Phone call",  icon: "bi-telephone-fill",    bg: "#E0F2FE", fg: "#0369A1", needs: null },
  { k: "In person",   icon: "bi-geo-alt-fill",      bg: "#DCFCE7", fg: "#15803D", needs: "place" },
];

export const modeMeta = (k) => MEETING_MODES.find((m) => m.k === k) || null;

export const CONNECT_VIA = ["Call", "WhatsApp", "Email", "SMS", "In person"];
export const CONNECT_OUTCOME = [
  "Connected", "No answer", "Busy — call later", "Switched off",
  "Wrong number", "Asked to call later", "Not interested",
];

/* ── The mails that go out once a meeting is fixed ────────────────────────── */
export const LADDER = [
  { k: "confirm", n: "Confirmation", short: "Conf", off: null },
  { k: "d2",   n: "2 days before",  short: "2d",   off: 48 },
  { k: "d1",   n: "1 day before",   short: "1d",   off: 24 },
  { k: "h3",   n: "3 hours before", short: "3h",   off: 3 },
  { k: "m45",  n: "45 mins before", short: "45m",  off: 0.75 },
];

/* ── Homework before the call ─────────────────────────────────────────────── */
export const PREP = [
  { k: "p1",  g: "Their business", n: "Read their website end to end" },
  { k: "p2",  g: "Their business", n: "Note what they sell and at what price" },
  { k: "p3",  g: "Their business", n: "Work out who their customer is, and where" },
  { k: "p4",  g: "Social",         n: "Instagram — followers, last nine posts" },
  { k: "p5",  g: "Social",         n: "Facebook page and Meta ad library" },
  { k: "p6",  g: "Social",         n: "YouTube / LinkedIn presence" },
  { k: "p7",  g: "Search",         n: "Google the brand name" },
  { k: "p8",  g: "Search",         n: "Google Business profile and reviews" },
  { k: "p9",  g: "Search",         n: "Do they rank for their main keyword?" },
  { k: "p10", g: "Competition",    n: "List three competitors doing it better" },
  { k: "p11", g: "Competition",    n: "Note what those competitors are running as ads" },
  { k: "p12", g: "Pitch",          n: "Write the three gaps we will point out" },
  { k: "p13", g: "Pitch",          n: "Pick two case studies close to their industry" },
  { k: "p14", g: "Pitch",          n: "Decide the package and price to open with" },
  { k: "p15", g: "Pitch",          n: "Prepare the first two questions to ask them" },
];

export const PREP_GROUPS = [...new Set(PREP.map((p) => p.g))];

/* ── How good is this lead? Weights add up to 10. ─────────────────────────── */
export const SCOREQ = [
  { k: "q1", n: "Budget clears our minimum retainer",   w: 2 },
  { k: "q2", n: "We are talking to the decision maker", w: 2 },
  { k: "q3", n: "There is a clear, urgent problem",     w: 1.5 },
  { k: "q4", n: "Business is running and already earning", w: 1.5 },
  { k: "q5", n: "An industry we have worked in before", w: 1 },
  { k: "q6", n: "Ready to start within 30 days",        w: 1 },
  { k: "q7", n: "Reachable and responsive so far",      w: 1 },
];

/* ── Columns. `on:false` starts hidden, `lock:true` can't be hidden. ──────── */
export const BASE_COLS = [
  { k: "id",       n: "Lead ID",     on: true,  lock: true,  w: 96 },
  { k: "nm",       n: "Name",        on: true,  lock: true,  w: 190 },
  { k: "co",       n: "Company",     on: true,  w: 160 },
  { k: "ph",       n: "Phone",       on: true,  w: 130 },
  { k: "em",       n: "Email",       on: false, w: 200 },
  { k: "city",     n: "City",        on: false, w: 110 },
  { k: "ind",      n: "Industry",    on: false, w: 150 },
  { k: "src",      n: "Source",      on: true,  w: 120 },
  { k: "campNm",   n: "Campaign",    on: true,  w: 150 },
  { k: "campId",   n: "Campaign ID", on: false, w: 130 },
  { k: "adset",    n: "Ad set",      on: false, w: 130 },
  { k: "ad",       n: "Ad name",     on: false, w: 130 },
  { k: "content",  n: "Content",     on: false, w: 120 },
  { k: "svc",      n: "Service",     on: false, w: 160 },
  { k: "budget",   n: "Budget",      on: true,  w: 150 },
  { k: "owner",    n: "Assign to",   on: true,  w: 145 },
  { k: "connects", n: "Connects",    on: true,  w: 95 },
  { k: "status",   n: "Status",      on: true,  w: 150 },
  { k: "score",    n: "Score",       on: true,  w: 90 },
  { k: "meeting",  n: "Meeting",     on: true,  w: 175 },
  { k: "mode",     n: "How",         on: true,  w: 125 },
  { k: "ladder",   n: "Reminders",   on: true,  w: 120 },
  { k: "prep",     n: "Prep",        on: true,  w: 110 },
  { k: "after",    n: "After meeting", on: true, w: 230 },
  // The three things the "After meeting" panel used to hide behind a click,
  // each with its own column and its own button.
  { k: "held",     n: "Meeting status", on: true, w: 130 },
  { k: "matSent",  n: "Material",    on: true,  w: 140 },
  { k: "prop",     n: "Proposal",    on: true,  w: 140 },
  { k: "created",  n: "Created",     on: false, w: 120 },
  { k: "act",      n: "Actions",     on: true,  lock: true, w: 130 },
];

/* ── Small helpers shared by the table, the cards and the CSV ─────────────── */

// "68b3…4bde" → "#C54BDE", short enough to say out loud on a call.
export const leadCode = (l) => `#${String(l?._id || "").slice(-6).toUpperCase()}`;

export const inr = (n) =>
  "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

// Compact rupees for the rail: ₹1.4L, ₹85K.
export const inrShort = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1).replace(/\.0$/, "")}Cr`;
  if (v >= 100000)   return `₹${(v / 100000).toFixed(1).replace(/\.0$/, "")}L`;
  if (v >= 1000)     return `₹${Math.round(v / 1000)}K`;
  return `₹${v}`;
};

// The budget is a label ("₹25,000 to ₹75,000"), so the pipeline needs a number.
export function budgetValue(b) {
  const nums = (String(b || "").replace(/,/g, "").match(/\d+/g) || [])
    .map(Number)
    .filter((n) => n >= 1000);
  if (!nums.length) return 0;
  if (nums.length === 1) return nums[0];
  return Math.round((nums[0] + nums[1]) / 2);
}

// Nothing on the form asks "where did you come from" — it's read off the click.
export function srcOf(l) {
  const s = l?.source || {};
  if (s.gclid) return "Google Ads";
  if (s.fbclid) return "Meta Ads";
  if (s.utmSource) {
    const u = s.utmSource.toLowerCase();
    if (u.includes("google")) return "Google Ads";
    if (u.includes("facebook") || u.includes("meta") || u.includes("fb")) return "Meta Ads";
    if (u.includes("insta")) return "Instagram";
    if (u.includes("linkedin")) return "LinkedIn";
    return s.utmSource;
  }
  if (s.referrer) return "Referral";
  if (l?.formType && !/query form/i.test(l.formType)) return l.formType;
  return "Website form";
}

export const scoreCol = (v) => {
  if (v === null || v === undefined || v === "") return { fg: "#94A3B8", bg: "#F1F5F9" };
  if (v >= 8) return { fg: "#15803D", bg: "#DCFCE7" };
  if (v >= 6) return { fg: "#4F46E5", bg: "#EEF2FF" };
  if (v >= 4) return { fg: "#B45309", bg: "#FEF3C7" };
  return { fg: "#B91C1C", bg: "#FEE2E2" };
};

export const prepPct = (l) =>
  Math.round(((l?.prep?.length || 0) / PREP.length) * 100);

export const initials = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

// Stable avatar tint per owner, so the same person is always the same colour.
export const tintFor = (seed) => {
  const tints = ["#6366F1", "#0EA5E9", "#16A34A", "#DB2777", "#EA580C", "#7C3AED", "#0891B2"];
  const s = String(seed || "");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973;
  return tints[h % tints.length];
};

export const prettyTime = (t) => {
  const [h, m] = String(t || "").split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

export const prettyDate = (d) => {
  if (!d) return "";
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  });
};

export const prettyDateLong = (d) => {
  if (!d) return "";
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
};

export const fmtDT = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
};

export const fmtD = (v) => {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

export const daysAgo = (v) => {
  if (!v) return "";
  const diff = Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  if (diff < 30) return `${diff} days ago`;
  const m = Math.floor(diff / 30);
  return `${m} month${m === 1 ? "" : "s"} ago`;
};

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const thisMonthStr = () => new Date().toISOString().slice(0, 7);

// A scheduled meeting whose time has come and gone.
export const meetingIsPast = (l) => {
  if (!l?.meetingDate) return false;
  const when = new Date(`${l.meetingDate}T${l.meetingTime || "23:59"}:00+05:30`);
  return when.getTime() < Date.now();
};
