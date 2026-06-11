// PATCH /api/employee/tasks/[id] — update a task owned/assigned to this employee
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import { emitTaskEvent } from "@/utils/tasks/emitTaskEvent";
import "@/models/tasks/Brand";
import "@/models/hr/Employee";

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

const ALLOWED_FIELDS = ["status", "stage", "description", "caption", "referenceLink", "proofLink", "pillar", "tags", "dueDate", "scheduledFor", "postedAt", "submittedAt", "reviewNote"];

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  try {
    const { id } = req.query;

    const empId = mongoose.Types.ObjectId.isValid(payload.id)
      ? new mongoose.Types.ObjectId(payload.id)
      : payload.id;

    const existing = await Task.findOne({
      _id: id,
      $or: [{ assignedTo: empId }, { "stages.assignedTo": empId }],
    });
    if (!existing) return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });

    const update = {};
    for (const f of ALLOWED_FIELDS) {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    }

    const task = await Task.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("brandId", "name color slug")
      .populate("assignedTo", "firstName lastName personal")
      .lean();

    emitTaskEvent("task:updated", { taskId: String(id), employeeIds: [String(empId)] });
    return res.json({ success: true, task });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
