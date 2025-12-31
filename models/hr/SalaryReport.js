import mongoose from "mongoose";

const SalaryReportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    month: { type: Number, required: true }, // 0-11
    year: { type: Number, required: true },

    payrollId: { type: String, required: true },

    basicSalary: { type: Number, required: true },

    deductions: {
      late: { type: Number, default: 0 },
      unpaidLeave: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    reimbursement: {
      pending: { type: Number, default: 0 },
      approved: { type: Number, default: 0 },
      paid: { type: Number, default: 0 },
    },

    netPay: { type: Number, required: true },

    status: {
      type: String,
      enum: ["Pending", "Processed"],
      default: "Pending",
    },

    processedAt: Date,
  },
  { timestamps: true }
);

// one record per employee per month
SalaryReportSchema.index(
  { employee: 1, month: 1, year: 1 },
  { unique: true }
);

export default mongoose.models.SalaryReport ||
  mongoose.model("SalaryReport", SalaryReportSchema);
