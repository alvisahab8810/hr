// pages/api/admin/salespeople.js
import { getToken } from "next-auth/jwt";
import dbConnect from "../../../utils/dbConnect.js";  // <- RELATIVE path
import User from "../../../models/User.js";

const secret = process.env.NEXTAUTH_SECRET;

export default async function handler(req, res) {
  const token = await getToken({ req, secret });
  const legacy = (req.headers.cookie || "").includes("admin_auth=true");

  if (!(token?.role === "admin" || legacy)) {
    console.warn("403 – not admin");
    return res.status(403).json({ message: "Forbidden" });
  }

  try {
    await dbConnect();
    const salespeople = await User.find({ role: "salesperson" }).select(
      "name email phone createdAt"
    );
    return res.status(200).json(salespeople);
  } catch (err) {
    console.error("500 – API error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
