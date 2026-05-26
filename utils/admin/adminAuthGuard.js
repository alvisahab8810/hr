// Accepts both main-admin (admin_auth=true cookie) and
// sub-admin/manager (admin_user_token JWT cookie) sessions.
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";

export function adminGuard(req, res) {
  const cookie = req.headers.cookie || "";

  // Main admin session
  if (cookie.includes("admin_auth=true")) return true;

  // Sub-admin / manager JWT session
  const match = cookie.match(/admin_user_token=([^;]+)/);
  if (match) {
    try {
      jwt.verify(match[1], JWT_SECRET);
      return true;
    } catch {
      // expired or invalid — fall through to 401
    }
  }

  res.status(401).json({ success: false, message: "Unauthorized" });
  return false;
}

// Returns the decoded sub-admin payload (id, name, role, permissions)
// or null for the main admin or unauthenticated requests.
export function getAdminUserPayload(req) {
  const cookie = req.headers.cookie || "";
  const match  = cookie.match(/admin_user_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], JWT_SECRET); }
  catch { return null; }
}
