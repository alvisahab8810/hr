// pages/api/admin/admin-users/resend-invite.js
// POST — resend invitation email for a pending user

import dbConnect from "@/utils/dbConnect";
import AdminUser from "@/models/AdminUser";
import { sendInviteEmail } from "@/utils/email/inviteEmail";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";
const BASE_URL   = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) return res.status(401).json({ success: false });

  await dbConnect();
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, message: "User ID required" });

  const user = await AdminUser.findById(id).select("+inviteToken +inviteTokenExpiry");
  if (!user)           return res.status(404).json({ success: false, message: "User not found" });
  if (user.passwordSet) return res.status(400).json({ success: false, message: "User already set their password" });

  const inviteToken       = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: "24h" });
  const inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  user.inviteToken       = inviteToken;
  user.inviteTokenExpiry = inviteTokenExpiry;
  await user.save();

  const setPasswordUrl = `${BASE_URL}/admin/set-password?token=${inviteToken}`;
  await sendInviteEmail({ to: user.email, name: user.name, role: user.role, setPasswordUrl });

  return res.json({ success: true, message: "Invitation resent" });
}
