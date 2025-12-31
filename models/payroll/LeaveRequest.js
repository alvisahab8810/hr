// import mongoose from "mongoose";

// const leaveRequestSchema = new mongoose.Schema(
//   {
//     employeeId: {
//       type: mongoose.Schema.Types.ObjectId,
//       required: true,
//       ref: "Employee",
//     },
//    type: {
//   type: String,
//   enum: ["Personal", "Sick"], // ✅ Only these two
//   required: true,
// },

//     from: { type: Date, required: true },
//     to: { type: Date, required: true },
//     reason: { type: String, required: true },
//     status: {
//       type: String,
//       enum: ["Pending", "Approved", "Rejected"],
//       default: "Pending",
//     },
//   },
//   { timestamps: true }
// );

// export default mongoose.models.LeaveRequest ||
//   mongoose.model("LeaveRequest", leaveRequestSchema);





// models/payroll/LeaveRequest.js
import mongoose from "mongoose";

const policyMetaSchema = new mongoose.Schema(
  {
    daysRequested: Number,
    halfDay: { type: Boolean, default: false },             // employee requested half-day
    advanceNoticeDays: Number,
    noticeOk: Boolean,
    medicalCertRequired: Boolean,
    medicalCertUrl: String,
    justificationRequired: Boolean,
    justificationText: String,
    dualApprovalRequired: Boolean,
    emergency: Boolean,
    sandwichFlag: Boolean,                                  // bridging weekend/holiday
    halfDayAllowed: Boolean,                                // <= 2/mo
    policyWarnings: [String],                               // captured messages
  },
  { _id: false }
);

const leaveRequestSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Employee",
    },
    type: {
      type: String,
      enum: ["Personal", "Sick"],
      required: true,
    },
    from: { type: Date, required: true },
    to: { type: Date, required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },

    // ✅ New — optional policy metadata
    policyMeta: policyMetaSchema,
  },
  { timestamps: true }
);

export default mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", leaveRequestSchema);
