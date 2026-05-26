import mongoose from "mongoose";

const TaskCommentSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    text: {
      type: String,
      required: true,
      trim: true,
    },

    commentedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "commentedByModel",
      required: true,
    },
    commentedByModel: {
      type: String,
      enum: ["AdminUser", "Employee"],
      required: true,
    },
    commentedByName: {
      type: String,
      required: true,
      trim: true,
    },

    attachments: [
      {
        name: String,
        path: String,
      },
    ],

    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.TaskComment ||
  mongoose.model("TaskComment", TaskCommentSchema);
