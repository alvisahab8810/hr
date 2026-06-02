// GET /api/employee/call-requests?brandId=xxx
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import CallRequest from "@/models/CallRequest";

function verifyToken(req) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false });

  await dbConnect();
  const emp = await Employee.findById(payload.id).lean();
  if (!emp) return res.status(404).json({ success: false });
  const dept = (emp.professional?.department || "").toLowerCase();
  if (!dept.includes("digital") && !dept.includes("marketing"))
    return res.status(403).json({ success: false });

  const { brandId } = req.query;
  if (!brandId) return res.status(400).json({ success: false, message: "brandId required" });

  const requests = await CallRequest.find({ brandId })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ success: true, requests });
}
