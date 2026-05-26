// PATCH - reassign a task to a different employee

import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import { logActivity } from "@/utils/tasks/logActivity";
import { sendNotification } from "@/utils/tasks/sendNotification";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    const { id } = req.query;
    const {
      assignedTo,
      performedById,
      performedByModel = "AdminUser",
      performedByName  = "Admin",
    } = req.body;

    if (!assignedTo) return res.status(400).json({ success: false, message: "assignedTo is required" });

    const task = await Task.findById(id).lean();
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const prevAssignee = task.assignedTo ? String(task.assignedTo) : null;

    const updated = await Task.findByIdAndUpdate(
      id,
      { $set: { assignedTo } },
      { new: true }
    )
      .populate("assignedTo", "firstName lastName personal professional")
      .populate("projectId",  "name status")
      .lean();

    await logActivity({
      taskId:          id,
      action:          prevAssignee ? "reassigned" : "assigned",
      from:            prevAssignee,
      to:              String(assignedTo),
      performedById,
      performedByModel,
      performedByName,
    });

    await sendNotification({
      recipientId:    assignedTo,
      recipientModel: "Employee",
      type:           prevAssignee ? "task_reassigned" : "task_assigned",
      message:        `Task "${updated.title}" has been assigned to you.`,
      taskId:         id,
    });

    return res.json({ success: true, task: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
