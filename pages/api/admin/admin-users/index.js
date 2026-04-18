// pages/api/admin/admin-users/index.js
// GET  — list all admin users
// POST — invite a new admin user (send email)

import dbConnect from "@/utils/dbConnect";
import AdminUser from "@/models/AdminUser";
import { sendInviteEmail } from "@/utils/email/inviteEmail";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";
const BASE_URL   = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

function adminGuard(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  // ── GET — list ──────────────────────────────────────────────────────────────
  if (req.method === "GET") {
    const users = await AdminUser.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, users });
  }

  // ── POST — invite ────────────────────────────────────────────────────────────
  if (req.method === "POST") {
    const { name, email, role, permissions } = req.body;

    if (!name?.trim() || !email?.trim() || !role) {
      return res.status(400).json({ success: false, message: "Name, email and role are required" });
    }

    const existing = await AdminUser.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "A user with this email already exists" });
    }

    // Create invite token (24h JWT)
    const inviteToken       = jwt.sign({ email: email.toLowerCase().trim() }, JWT_SECRET, { expiresIn: "24h" });
    const inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await AdminUser.create({
      name:  name.trim(),
      email: email.toLowerCase().trim(),
      role,
      permissions: permissions || {},
      status:      "Pending",
      inviteToken,
      inviteTokenExpiry,
    });

    // Send invitation email
    const setPasswordUrl = `${BASE_URL}/admin/set-password?token=${inviteToken}`;
    try {
      await sendInviteEmail({ to: user.email, name: user.name, role: user.role, setPasswordUrl });
    } catch (err) {
      console.error("Invite email failed:", err);
      // Don't fail the request — user is created, admin can resend
    }

    const { inviteToken: _, inviteTokenExpiry: __, password: ___, ...safe } = user.toObject();
    return res.status(201).json({ success: true, user: safe, message: "Invitation sent" });
  }

  return res.status(405).end();
}
