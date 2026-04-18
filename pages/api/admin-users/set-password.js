// pages/api/admin-users/set-password.js
// POST — validate invite token, set password, activate account

import dbConnect from "@/utils/dbConnect";
import AdminUser from "@/models/AdminUser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ success: false, message: "Token and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
  }

  // Verify JWT
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(400).json({ success: false, message: "Invalid or expired invitation link. Please contact your admin." });
  }

  const user = await AdminUser.findOne({ email: decoded.email }).select("+inviteToken +inviteTokenExpiry");
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  if (user.passwordSet) return res.status(400).json({ success: false, message: "Password already set. Please login." });

  // Check stored token matches
  if (user.inviteToken !== token) {
    return res.status(400).json({ success: false, message: "Invalid invitation link. A newer invite may have been sent." });
  }
  if (user.inviteTokenExpiry < new Date()) {
    return res.status(400).json({ success: false, message: "Invitation link expired. Please contact your admin." });
  }

  const hashed = await bcrypt.hash(password, 12);

  user.password          = hashed;
  user.passwordSet       = true;
  user.status            = "Active";
  user.inviteToken       = undefined;
  user.inviteTokenExpiry = undefined;
  await user.save();

  return res.json({ success: true, message: "Password set successfully. You can now login." });
}
