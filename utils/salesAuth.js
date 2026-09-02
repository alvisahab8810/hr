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
  "/api/admin/slots",
  "/api/admin/reports",
  "/api/admin/settings",
];

export function salesMayCall(url = "") {
  return SALES_API_OK.some((p) => url.startsWith(p));
}
