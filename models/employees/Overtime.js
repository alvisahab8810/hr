import mongoose from "mongoose";

const overtimeSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    project: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    otType: {
      type: String,
      required: true,
      enum: [
        "Weekday OT",
        "Weekend OT",
        "Holiday OT",
        "Client Deadline",
        "Campaign Launch",
        "Design Revisions",
        "Content Shoot / Edit",
        "Production Deployment",
        "Bug Fix / Hotfix",
        "Client Escalation",
        "Emergency Fix",
        "Late Night Work",
        "Early Morning Work",
      ],
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    otApprover: {
  type: String,
  required: true,
},


    tasks: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // admin / HR user
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    adminRemark: {
      type: String,
      default: "",
    },

    extensions: [
      {
        extraMins:   { type: Number, required: true, min: 15 },
        reason:      { type: String, default: "" },
        status:      { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
        requestedAt: { type: Date, default: Date.now },
        approvedAt:  { type: Date, default: null },
        adminRemark: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Overtime ||
  mongoose.model("Overtime", overtimeSchema);
