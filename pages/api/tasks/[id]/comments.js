// GET  - employee: get task comments (only own tasks)
// POST - employee: add a comment

import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import TaskComment from "@/models/tasks/TaskComment";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { logActivity } from "@/utils/tasks/logActivity";

export default async function handler(req, res) {
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  const { id } = req.query;

  /* ── Verify task belongs to employee ── */
  const task = await Task.findOne({ _id: id, assignedTo: employee._id }).lean();
  if (!task) return res.status(404).json({ success: false, message: "Task not found" });

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const comments = await TaskComment.find({ taskId: id }).sort({ createdAt: 1 }).lean();
      return res.json({ success: true, comments });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST ── */
  if (req.method === "POST") {
    try {
      const { text } = req.body;
      if (!text?.trim()) return res.status(400).json({ success: false, message: "Comment text is required" });

      const comment = await TaskComment.create({
        taskId:           id,
        text:             text.trim(),
        commentedBy:      employee._id,
        commentedByModel: "Employee",
        commentedByName:  `${employee.firstName} ${employee.lastName}`,
      });

      await logActivity({
        taskId:          id,
        action:          "comment_added",
        remark:          `Comment by ${employee.firstName} ${employee.lastName}`,
        performedById:   employee._id,
        performedByModel: "Employee",
        performedByName: `${employee.firstName} ${employee.lastName}`,
      });

      return res.status(201).json({ success: true, comment });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
