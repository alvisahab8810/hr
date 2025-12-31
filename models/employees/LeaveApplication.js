import mongoose from "mongoose";

const LeaveApplicationSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    leaveType: {
      type: String,
      enum: ["Sick Leave", "Earned Leave", "Casual Leave"],
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    totalDays: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      required: true,
    },

    documents: {
      type: [String], // file paths or URLs
      default: [],
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Retracted", "Draft"],
      default: "Pending",
    },

    // 🔹 HR POLICY FLAGS (IMPORTANT)
    policyFlags: {
      needsMedicalDoc: { type: Boolean, default: false },
      advanceNoticeIssue: { type: Boolean, default: false },
      sandwichLeave: { type: Boolean, default: false },
    },

    adminRemark: {
      type: String,
      default: "",
    },

    employeeRemark: {
      type: String,
      default: "",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: Date,
    rejectedAt: Date,
    retractedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.LeaveApplication ||
  mongoose.model("LeaveApplication", LeaveApplicationSchema);
