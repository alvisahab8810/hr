// pages/api/admin-users/me.js
import dbConnect from "@/utils/dbConnect";
import AdminUser from "@/models/AdminUser";
import jwt from "jsonwebtoken";
import { parse } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const cookies = parse(req.headers.cookie || "");
  const token   = cookies.admin_user_token;
  if (!token) return res.status(401).json({ success: false, message: "Not authenticated" });

  let decoded;
  try { decoded = jwt.verify(token, JWT_SECRET); }
  catch { return res.status(401).json({ success: false, message: "Session expired" }); }

  await dbConnect();
  const user = await AdminUser.findById(decoded.id).lean();
  if (!user) return res.status(401).json({ success: false, message: "User not found" });

  return res.json({ success: true, user });
}
