// pages/api/admin-users/logout.js
import { serialize } from "cookie";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", serialize("admin_user_token", "", {
    httpOnly: true, path: "/", maxAge: 0,
  }));
  return res.json({ success: true });
}
