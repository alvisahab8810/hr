// pages/api/payroll/logout.js
import cookie from "cookie";

export default function handler(req, res) {
  res.setHeader("Set-Cookie", cookie.serialize("employee_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    expires: new Date(0),
    path: "/",
  }));
  res.status(200).json({ success: true });
}
