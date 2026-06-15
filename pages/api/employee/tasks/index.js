// GET  /api/employee/tasks  — tasks assigned to the logged-in employee
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import "@/models/tasks/Brand";
import "@/models/hr/Employee";
import "@/models/AdminUser";
import "@/models/projects/Project";
import "@/models/projects/Sprint";

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
    const { status, stage, contentType, taskType } = req.query;

    // Explicitly cast to ObjectId so Mongoose matching works for both
    // top-level assignedTo (single) and stages[*].assignedTo (array of ObjectIds)
    const empId = mongoose.Types.ObjectId.isValid(payload.id)
      ? new mongoose.Types.ObjectId(payload.id)
      : payload.id;

    const q = {
      $or: [
        { assignedTo: empId },
        { "stages.assignedTo": empId },
      ],
    };
    if (status)      q.status      = status;
    if (stage)       q.stage       = stage;
    if (contentType) q.contentType = contentType;
    if (taskType)    q.taskType    = taskType;

    const tasks = await Task.find(q)
      .populate("brandId",    "name color slug")
      .populate("assignedBy", "firstName lastName")
      .populate({ path: "projectId", select: "name endDate brandId", populate: { path: "brandId", select: "name color" } })
      .populate("sprintId",   "name endDate")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    return res.json({ success: true, tasks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
