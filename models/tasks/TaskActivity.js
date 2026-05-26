import mongoose from "mongoose";

const TaskActivitySchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    action: {
      type: String,
      enum: [
        "created",
        "status_changed",
        "priority_changed",
        "assigned",
        "reassigned",
        "due_date_changed",
        "comment_added",
        "attachment_added",
        "attachment_removed",
        "title_changed",
        "description_changed",
        "sprint_changed",
        "project_changed",
        "completed",
        "blocked",
      ],
      required: true,
    },

    from: { type: String, default: null },
    to:   { type: String, default: null },

    remark: { type: String, default: "" },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "performedByModel",
      default: null,
    },
    performedByModel: {
      type: String,
      enum: ["AdminUser", "Employee", "System"],
      default: "AdminUser",
    },
    performedByName: {
      type: String,
      default: "Admin",
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.TaskActivity ||
  mongoose.model("TaskActivity", TaskActivitySchema);
