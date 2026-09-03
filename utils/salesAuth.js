// utils/salesAuth.js — the salesperson session.
// A salesperson signs in on /sales/login and gets a JWT in `sales_token`.
// It carries the menu permissions so the sidebar and the pages can be gated
// without another round trip.
import jwt from "jsonwebtoken";

export const SALES_COOKIE = "sales_token";
const SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";

export function signSales(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function readSales(cookie = "") {
  const m = String(cookie).match(/sales_token=([^;]+)/);
  if (!m) return null;
  try { return jwt.verify(decodeURIComponent(m[1]), SECRET); }
  catch { return null; }
}

// Only the CRM lives behind a salesperson login — payroll and the website
// editors stay admin-only even if the token is valid.
const SALES_API_OK = [
  "/api/admin/leads",
  "/api/admin/proposals",
  "/api/admin/invoices",
  "/api/admin/settings",
  // Their own numbers on the panel home.
  "/api/admin/reports",
];

export function salesMayCall(url = "") {
  return SALES_API_OK.some((p) => url.startsWith(p));
}

/* ── Whose leads is this request allowed to see? ──────────────────────────────
   An admin sees the whole board. A salesperson only sees the leads the admin
   has assigned to them, and everything that hangs off those leads — proposals,
   invoices, the profile, the mails. */
export function salesId(req) {
  const s = readSales(req?.headers?.cookie || "");
  return s?.id ? String(s.id) : null;
}

/* Adds the owner clause to a Query filter when a salesperson is asking. */
export function scopeLeadFilter(req, filter = {}) {
  const id = salesId(req);
  return id ? { ...filter, salespersonId: id } : filter;
}
