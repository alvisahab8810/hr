// pages/api/sales/login.js — the salesperson sign-in.
import dbConnect from "@/utils/dbConnect";
import Salesperson from "@/models/Salesperson";
import { signSales, SALES_COOKIE } from "@/utils/salesAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });
  await dbConnect();

  const username = String(req.body?.username || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (!username || !password) return res.status(400).json({ success: false, message: "Username and password are required" });

  const sp = await Salesperson.findOne({ username });
  if (!sp || sp.password !== password) return res.status(401).json({ success: false, message: "Wrong username or password" });
  if (!sp.active) return res.status(403).json({ success: false, message: "This account has been switched off" });

  const raw = sp.permissions?.toObject ? sp.permissions.toObject() : { ...(sp.permissions || {}) };
  // The subdocument carries an _id of its own; the cookie only wants the flags.
  const perms = Object.fromEntries(Object.entries(raw).filter(([k, v]) => typeof v === "boolean"));
  const token = signSales({ id: String(sp._id), name: sp.name, perms });

  sp.lastLogin = new Date();
  await sp.save().catch(() => {});

  // The sidebar reads the permissions client side, so that half is readable.
  res.setHeader("Set-Cookie", [
    `${SALES_COOKIE}=${token}; Path=/; Max-Age=604800; SameSite=Lax`,
    `sales_name=${encodeURIComponent(sp.name)}; Path=/; Max-Age=604800; SameSite=Lax`,
    `sales_perms=${encodeURIComponent(JSON.stringify(perms))}; Path=/; Max-Age=604800; SameSite=Lax`,
  ]);
  return res.status(200).json({ success: true, name: sp.name, perms });
}
