// POST /api/client/features/[id]/review
// Client approves (→completed) or rejects (→in_progress) a feature that is in 'review'
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import Project from "@/models/projects/Project";

function getToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const payload = getToken(req);
  if (!payload || payload.role !== "client")
    return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  const clientId = mongoose.Types.ObjectId.isValid(payload.id)
    ? new mongoose.Types.ObjectId(payload.id)
    : null;
  if (!clientId) return res.status(400).json({ success: false, message: "Invalid token" });

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(400).json({ success: false, message: "Invalid feature id" });

  const feature = await Task.findOne({ _id: id, taskType: "project" }).lean();
  if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });

  if (feature.status !== "review")
    return res.status(400).json({ success: false, message: "Feature is not in review status" });

  // Verify this feature belongs to a project owned by this client
  const project = await Project.findOne({ _id: feature.projectId, clientId }).lean();
  if (!project) return res.status(403).json({ success: false, message: "Forbidden" });

  const { action, clientReviewNote } = req.body;
  if (!["approve", "reject"].includes(action))
    return res.status(400).json({ success: false, message: "action must be 'approve' or 'reject'" });

  if (action === "reject" && !clientReviewNote?.trim())
    return res.status(400).json({ success: false, message: "clientReviewNote is required when rejecting" });

  const update =
    action === "approve"
      ? { status: "completed" }
      : { status: "in_progress", clientReviewNote: clientReviewNote.trim() };

  const updated = await Task.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();
  return res.json({ success: true, feature: updated });
}
