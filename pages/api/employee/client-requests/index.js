// GET /api/employee/client-requests — read-only task requests list for DM employees
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import TaskRequest from "@/models/TaskRequest";
import "@/models/clients/Client";
import "@/models/tasks/Brand";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return res.status(401).json({ success: false });

  try {
    await dbConnect();
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const emp = await Employee.findById(payload.id).select("professional").lean();
    if (!emp) return res.status(404).json({ success: false });

    const dept = (emp.professional?.department || "").toLowerCase();
    const isDm = dept.includes("digital") || dept.includes("marketing");
    if (!isDm) return res.status(403).json({ success: false, message: "Access restricted to Digital Marketing team" });

    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const requests = await TaskRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("clientId", "name email")
      .populate("brandId", "name color slug")
      .lean();

    return res.json({ success: true, requests });
  } catch {
    return res.status(401).json({ success: false });
  }
}
