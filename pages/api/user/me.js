

// pages/api/user/me.js  (or api/user/me/index.js)
import { getToken } from "next-auth/jwt";
import dbConnect from "../../../utils/dbConnect";   // adjust if your path differs
import User from "../../../models/User";

const secret = process.env.NEXTAUTH_SECRET; // MUST exist in .env.local

export default async function handler(req, res) {
  /* ── 1. Verify session ─────────────────────────── */
  const token = await getToken({ req, secret });
  const userId = token?.id || token?.sub;      // ← accept id OR sub
  if (!userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  /* ── 2. DB connect & fetch user ─────────────────── */
  await dbConnect();
  const user = await User.findById(userId).select("-password");
  if (!user) return res.status(404).json({ message: "User not found" });

  /* ── 3. GET  => return profile ──────────────────── */
  if (req.method === "GET") {
    return res.status(200).json(user);
  }

  /* ── 4. PUT  => update profile ──────────────────── */
  if (req.method === "PUT") {
    const { name, phone, about, avatarUrl } = req.body;

    user.name = name;
    user.phone = phone;
    user.about = about;
    user.avatarUrl = avatarUrl;
    await user.save();

    return res.status(200).json({ message: "Profile updated" });
  }

  /* ── 5. Other HTTP verbs ───────────────────────── */
  return res.status(405).json({ message: "Method not allowed" });
}
