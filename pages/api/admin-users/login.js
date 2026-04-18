// pages/api/admin-users/login.js
import dbConnect from "@/utils/dbConnect";
import AdminUser from "@/models/AdminUser";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: "Email and password required" });

  const user = await AdminUser.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user)             return res.status(401).json({ success: false, message: "Invalid email or password" });
  if (!user.passwordSet) return res.status(401).json({ success: false, message: "Please set your password first via the invitation email" });
  if (user.status !== "Active") return res.status(401).json({ success: false, message: "Your account is inactive. Contact admin." });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ success: false, message: "Invalid email or password" });

  // Issue session JWT
  const token = jwt.sign(
    { id: user._id.toString(), email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.setHeader("Set-Cookie", serialize("admin_user_token", token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   7 * 24 * 60 * 60,
  }));

  const { password: _, ...safe } = user.toObject();
  return res.json({ success: true, user: { ...safe, permissions: user.permissions } });
}
