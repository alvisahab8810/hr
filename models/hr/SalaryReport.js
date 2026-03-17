// models/hr/SalaryReport.js
import mongoose from "mongoose";

const SalaryReportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    month: { type: Number, required: true }, // 0–11
    year:  { type: Number, required: true },

    payrollId:    { type: String, required: true },
    basicSalary:  { type: Number, required: true },

    // ── Working day metadata ────────────────────────────
    workingDays:        { type: Number, default: 26 },   // total in full month
    elapsedWorkingDays: { type: Number, default: 0 },    // days counted so far
    earnedSalary:       { type: Number, default: 0 },    // pro-rated salary base
    isPartialMonth:     { type: Boolean, default: false },
    generatedOn:        { type: String,  default: '' },  // YYYY-MM-DD

    // ── Attendance summary ──────────────────────────────
    presentDays:  { type: Number, default: 0 },
    absentDays:   { type: Number, default: 0 },
    lateCount:    { type: Number, default: 0 },
    halfDayCount: { type: Number, default: 0 },

    // ── Deductions ──────────────────────────────────────
    deductions: {
      absent:      { type: Number, default: 0 },
      halfDay:     { type: Number, default: 0 },
      late:        { type: Number, default: 0 },
      unpaidLeave: { type: Number, default: 0 },
      lunch:       { type: Number, default: 0 }, // lunch overrun penalty
      other:       { type: Number, default: 0 }, // manual adjustments
      total:       { type: Number, default: 0 },
    },

    // ── Overtime ────────────────────────────────────────
    overtime: {
      hours:  { type: Number, default: 0 },
      amount: { type: Number, default: 0 },
    },

    // ── Reimbursement ───────────────────────────────────
    reimbursement: {
      approved: { type: Number, default: 0 },
      pending:  { type: Number, default: 0 },
      paid:     { type: Number, default: 0 },
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

SalaryReportSchema.index(
  { employee: 1, month: 1, year: 1 },
  { unique: true }
);

export default mongoose.models.SalaryReport ||
  mongoose.model("SalaryReport", SalaryReportSchema);




// import mongoose from "mongoose";

// const SalaryReportSchema = new mongoose.Schema(
//   {
//     employee: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Employee",
//       required: true,
//     },

//     month: { type: Number, required: true }, // 0-11
//     year: { type: Number, required: true },

//     payrollId: { type: String, required: true },

//     basicSalary: { type: Number, required: true },

//      // ✅ ADD THIS BLOCK
//     overtime: {
//       hours: { type: Number, default: 0 },
//       amount: { type: Number, default: 0 },
//     },

//     deductions: {
//       late: { type: Number, default: 0 },
//       unpaidLeave: { type: Number, default: 0 },
//       other: { type: Number, default: 0 },
//       total: { type: Number, default: 0 },
//     },

//     reimbursement: {
//       pending: { type: Number, default: 0 },
//       approved: { type: Number, default: 0 },
//       paid: { type: Number, default: 0 },
//     },

//     netPay: { type: Number, required: true },

//     status: {
//       type: String,
//       enum: ["Pending", "Processed"],
//       default: "Pending",
//     },

//     processedAt: Date,
//   },
//   { timestamps: true }
// );

// // one record per employee per month
// SalaryReportSchema.index(
//   { employee: 1, month: 1, year: 1 },
//   { unique: true }
// );

// export default mongoose.models.SalaryReport ||
//   mongoose.model("SalaryReport", SalaryReportSchema);
