// GET /api/employee/tasks/nomenclature?brandId=...&contentType=... — nomenclature preview for employee JWT
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Task from "@/models/tasks/Task";

const JWT_SECRET  = process.env.JWT_SECRET || "viralon_invite_secret_2024";
const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

async function verifyEmployee(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const emp = await Employee.findById(payload.id).select("professional").lean();
    return emp || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const emp = await verifyEmployee(req);
  if (!emp) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();
  const { brandId, contentType } = req.query;
  if (!brandId || !contentType) return res.status(400).json({ success: false, message: "brandId and contentType required" });

  const now        = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const count      = await Task.countDocuments({ brandId, contentType, createdAt: { $gte: monthStart, $lte: monthEnd } });
  const nomenclature = `${contentType}${count + 1} ${MONTH_SHORT[now.getMonth()]}'${String(now.getFullYear()).slice(2)}`;
  return res.json({ success: true, nomenclature });
}
