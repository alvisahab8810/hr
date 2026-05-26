// GET /api/employee/dev/features?projectId=...
// Returns project-type features assigned to the logged-in employee
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import Project from "@/models/projects/Project";
import Sprint from "@/models/projects/Sprint";
import "@/models/hr/Employee";

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

  const empId = mongoose.Types.ObjectId.isValid(payload.id)
    ? new mongoose.Types.ObjectId(payload.id)
    : null;
  if (!empId) return res.status(400).json({ success: false, message: "Invalid token" });

  const { projectId } = req.query;

  try {
    // Get projects this employee is a member of
    const projectFilter = { members: empId, status: { $ne: "cancelled" } };
    if (projectId) projectFilter._id = new mongoose.Types.ObjectId(projectId);

    const projects = await Project.find(projectFilter)
      .populate("clientId", "name company")
      .populate("brandId", "name color")
      .sort({ updatedAt: -1 })
      .lean();

    if (projects.length === 0) {
      return res.json({ success: true, projects: [], sprints: [], features: [] });
    }

    const projectIds = projects.map(p => p._id);

    const [sprints, features] = await Promise.all([
      Sprint.find({ projectId: { $in: projectIds } }).sort({ createdAt: 1 }).lean(),
      Task.find({ taskType: "project", projectId: { $in: projectIds } })
        .populate("assignedTo", "firstName lastName personal")
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    return res.json({ success: true, projects, sprints, features });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
