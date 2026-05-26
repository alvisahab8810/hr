import mongoose from "mongoose";

const SprintSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    goal: { type: String, default: "" },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    status: {
      type: String,
      enum: ["planned", "active", "completed", "cancelled"],
      default: "planned",
    },

    phase: {
      type: String,
      enum: ["uiux", "development", "testing", "launch"],
      default: "development",
    },

    durationDays: { type: Number, default: null },

    startDate: { type: Date, default: null },
    endDate:   { type: Date, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByModel",
    },
    createdByModel: {
      type: String,
      enum: ["AdminUser", "Employee"],
      default: "AdminUser",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Sprint || mongoose.model("Sprint", SprintSchema);
