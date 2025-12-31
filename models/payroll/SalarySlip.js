import mongoose from "mongoose";

const SalarySlipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    month: {
      type: String,
      required: true,
      match: /^(0[1-9]|1[0-2]|[A-Za-z]+)$/, // ✅ Accepts MM or Month Name
    },
    year: {
      type: Number,
      required: true,
      min: 2000, // ✅ Reasonable validation
    },
    basicPay: {
      type: Number,
      required: true,
      min: 0,
    },
    hra: {
      type: Number,
      default: 0,
      min: 0,
    },
    allowances: {
      type: Number,
      default: 0,
      min: 0,
    },
    deductions: {
      type: Number,
      default: 0,
      min: 0,
    },
    netPay: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Generated", "Paid"],
      default: "Generated",
    },
  },
  { timestamps: true }
);

export default mongoose.models.SalarySlip ||
  mongoose.model("SalarySlip", SalarySlipSchema);
