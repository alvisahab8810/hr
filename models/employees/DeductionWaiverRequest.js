import mongoose from "mongoose";

const DeductionWaiverRequestSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // Which payroll month/year the deduction belongs to
    month: { type: Number, required: true }, // 0–11
    year:  { type: Number, required: true },

    deductionType: {
      type: String,
      enum: ["absent", "late", "lunch", "halfDay", "unpaidLeave", "other"],
      required: true,
    },

    // Original deduction amount the employee wants waived
    amount: { type: Number, required: true },

    // Employee's explanation
    reason: { type: String, required: true, trim: true },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    adminRemark: { type: String, default: "" },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    approvedAt: Date,

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    rejectedAt: Date,
  },
  { timestamps: true }
);

DeductionWaiverRequestSchema.index({ employee: 1, month: 1, year: 1 });
DeductionWaiverRequestSchema.index({ status: 1 });

export default mongoose.models.DeductionWaiverRequest ||
  mongoose.model("DeductionWaiverRequest", DeductionWaiverRequestSchema);
