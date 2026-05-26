// GET /api/employee/projects — projects where this employee is a member
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Project from "@/models/projects/Project";
import "@/models/clients/Client";
import "@/models/tasks/Brand";

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  try {
    const projects = await Project.find({ members: payload.id, status: { $ne: "cancelled" } })
      .populate("clientId", "name company")
      .populate("brandId", "name color")
      .sort({ updatedAt: -1 })
      .lean();

    return res.json({ success: true, projects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
