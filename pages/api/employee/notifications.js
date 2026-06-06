// GET  /api/employee/notifications — unread task + DM notifications for logged-in employee
// POST /api/employee/notifications — mark all as read ({ markRead: true })
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Notification from "@/models/Notification";
import TeamDMMessage from "@/models/TeamDMMessage";

function getPayload(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

const TYPE_LABEL = {
  task_assigned:         "Task Assigned",
  task_reassigned:       "Task Reassigned",
  task_status_changed:   "Status Updated",
  task_comment_added:    "New Comment",
  task_overdue:          "Task Overdue",
  task_due_soon:         "Due Soon",
  task_completed:        "Task Completed",
  task_blocked:          "Task Rejected",
  project_update:        "Project Update",
  sprint_update:         "Sprint Update",
  task_request:          "Task Request",
  task_request_reviewed: "Request Reviewed",
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const payload = getPayload(req);
  if (!payload?.id) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  const empId = new mongoose.Types.ObjectId(payload.id);

  if (req.method === "POST" && req.body?.markRead) {
    await Notification.updateMany(
      { recipientId: empId, recipientModel: "Employee", isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    return res.json({ success: true });
  }

  const [taskNotifs, dmUnread] = await Promise.all([
    Notification.find({ recipientId: empId, recipientModel: "Employee", isRead: false })
      .sort({ createdAt: -1 }).limit(15).lean(),
    TeamDMMessage.countDocuments({
      employeeId: empId,
      senderType: "admin",
      readByEmployee: false,
    }),
  ]);

  const recent = taskNotifs.map(n => ({
    _id:     String(n._id),
    type:    n.type,
    label:   TYPE_LABEL[n.type] || "Notification",
    message: n.message,
    taskId:  n.taskId ? String(n.taskId) : null,
    at:      n.createdAt,
  }));

  return res.json({
    success:     true,
    recent,
    taskUnread:  taskNotifs.length,
    dmUnread,
    total:       taskNotifs.length + dmUnread,
  });
}
