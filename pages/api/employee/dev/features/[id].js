// PATCH /api/employee/dev/features/[id]
// Employee updates their own feature: status + workReport + proofLink
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import Project from "@/models/projects/Project";

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  const empId = mongoose.Types.ObjectId.isValid(payload.id)
    ? new mongoose.Types.ObjectId(payload.id)
    : null;
  if (!empId) return res.status(400).json({ success: false, message: "Invalid token" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "Invalid feature id" });

  const feature = await Task.findOne({ _id: id, taskType: "project" }).lean();
  if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });

  // Verify employee is a member of the project
  const project = await Project.findOne({ _id: feature.projectId, members: empId }).lean();
  if (!project) return res.status(403).json({ success: false, message: "Not a project member" });

  const { status, workReport, proofLink } = req.body;

  const ALLOWED_TRANSITIONS = {
    todo:        ["in_progress"],
    in_progress: ["review", "blocked"],
    review:      ["in_progress"],   // reopen if needed
    blocked:     ["in_progress"],
    completed:   [],
  };

  const allowed = ALLOWED_TRANSITIONS[feature.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Cannot transition from '${feature.status}' to '${status}'`,
    });
  }

  // Require workReport + proofLink when submitting for review
  if (status === "review") {
    if (!workReport?.trim())
      return res.status(400).json({ success: false, message: "workReport is required for review submission" });
    if (!proofLink?.trim())
      return res.status(400).json({ success: false, message: "proofLink is required for review submission" });
  }

  const update = { status };
  if (workReport !== undefined) update.workReport = workReport.trim();
  if (proofLink !== undefined) update.proofLink = proofLink.trim();

  const updated = await Task.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  return res.json({ success: true, feature: updated });
}
