// GET  - list comments for a task
// POST - add a comment

import dbConnect from "@/utils/dbConnect";
import TaskComment from "@/models/tasks/TaskComment";
import Task from "@/models/tasks/Task";
import { logActivity } from "@/utils/tasks/logActivity";
import { logAdminActivity } from "@/utils/tasks/logAdminActivity";
import { sendNotification } from "@/utils/tasks/sendNotification";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const comments = await TaskComment.find({ taskId: id })
        .sort({ createdAt: 1 })
        .lean();
      return res.json({ success: true, comments });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST ── */
  if (req.method === "POST") {
    try {
      const { text, commentedById, commentedByModel = "AdminUser", commentedByName } = req.body;

      if (!text?.trim()) return res.status(400).json({ success: false, message: "Comment text is required" });
      if (!commentedById) return res.status(400).json({ success: false, message: "commentedById is required" });

      const comment = await TaskComment.create({
        taskId:           id,
        text:             text.trim(),
        commentedBy:      commentedById,
        commentedByModel,
        commentedByName:  commentedByName || "Admin",
      });

      await logActivity({
        taskId:          id,
        action:          "comment_added",
        remark:          `Comment by ${commentedByName || "Admin"}`,
        performedById:   commentedById,
        performedByModel: commentedByModel,
        performedByName: commentedByName || "Admin",
      });

      // Notify task assignee
      const task = await Task.findById(id).lean();

      // Track manager comment in admin activity log
      if (commentedByModel === "AdminUser" && commentedById) {
        logAdminActivity({
          adminUserId:   commentedById,
          adminUserName: commentedByName || "Manager",
          action:        "comment_added",
          category:      "comment",
          description:   `Added a comment on task "${task?.title || id}"`,
          metadata:      { taskId: id, taskTitle: task?.title || "" },
        }).catch(() => {});
      }
      if (task?.assignedTo && String(task.assignedTo) !== String(commentedById)) {
        await sendNotification({
          recipientId:    task.assignedTo,
          recipientModel: "Employee",
          type:           "task_comment_added",
          message:        `New comment on task "${task.title}"`,
          taskId:         id,
        });
      }

      return res.status(201).json({ success: true, comment });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
