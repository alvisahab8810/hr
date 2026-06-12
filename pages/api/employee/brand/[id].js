// GET /api/employee/brand/[id] — returns brand services + monthlyDeliverables for DM employees
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Brand from "@/models/tasks/Brand";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";

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
  const { id } = req.query;
  const brand = await Brand.findById(id).select("name color slug services monthlyDeliverables seoSettings").lean();
  if (!brand) return res.status(404).json({ success: false, message: "Not found" });
  return res.json({ success: true, brand });
}
