import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipientModel",
      required: true,
      index: true,
    },
    recipientModel: {
      type: String,
      enum: ["AdminUser", "Employee", "Client"],
      required: true,
    },

    type: {
      type: String,
      enum: [
        "task_assigned",
        "task_status_changed",
        "task_comment_added",
        "task_overdue",
        "task_due_soon",
        "task_completed",
        "task_blocked",
        "task_reassigned",
        "project_update",
        "sprint_update",
        "task_request",
        "task_request_reviewed",
      ],
      required: true,
    },

    message: { type: String, required: true },

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      default: null,
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TaskRequest",
      default: null,
    },

    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, isRead: 1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
