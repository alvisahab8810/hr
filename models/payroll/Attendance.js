// =========================== this is old schema ====================





// // models/payroll/Attendance.js
// import mongoose from "mongoose";

// const punchSchema = new mongoose.Schema(
//   {
//     in: { type: Date, required: true },
//     out: { type: Date, default: null },
//   },
//   { _id: false }
// );

// const attendanceSchema = new mongoose.Schema({
//   employee: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: "Employee",
//     required: true,
//   },
//   date: {
//     type: String, // YYYY-MM-DD
//     required: true,
//   },

//   // Legacy fields (still kept for backward compatibility)
//   loginTime: { type: String },
//   logoutTime: { type: String },

//   // Multi-punch support
//   punches: { type: [punchSchema], default: [] },

//   totalWorkedMinutes: { type: Number, default: 0 },
//   totalBreakMinutes: { type: Number, default: 0 },
//   longestBreakMinutes: { type: Number, default: 0 },
//   lunchBreakExceeded: { type: Boolean, default: false }, // >50m break

//   // Late Arrival Tracking
//   lateMark: { type: Boolean, default: false }, // <-- Added field for late arrival
  

//   // Summary flags
//   isHalfDay: { type: Boolean, default: false },
//   status: {
//     type: String,
//     enum: ["present", "absent", "weekend", "leave"],
//     default: "absent",
//   },
//   leaveType: {
//     type: String,
//     enum: ["paid", "unpaid", "none"],
//     default: "none",
//   },
//   regularized: { type: Boolean, default: false },

//   // Geo-Location tracking
//   loginLocation: {
//     latitude: Number,
//     longitude: Number,
//   },
//   logoutLocation: {
//     latitude: Number,
//     longitude: Number,
//   },
// });

// attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

// export default mongoose.models.Attendance ||
//   mongoose.model("Attendance", attendanceSchema);














// ==========================================this is current schema ===============================


// models/payroll/Attendance.js
import mongoose from "mongoose";

const punchSchema = new mongoose.Schema(
  {
    in: { type: Date, required: true },
    out: { type: Date, default: null },
  },
  { _id: false }
);

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee", // 🔹 reference the new Employee model
    required: true,
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true,
  },

  // Legacy fields
  loginTime: { type: String },
  logoutTime: { type: String },

  // Multi-punch support
  punches: { type: [punchSchema], default: [] },

  totalWorkedMinutes: { type: Number, default: 0 },
  totalBreakMinutes: { type: Number, default: 0 },
  longestBreakMinutes: { type: Number, default: 0 },
  lunchBreakExceeded: { type: Boolean, default: false },

  // Late Arrival Tracking
  lateMark: { type: Boolean, default: false },

  // Summary flags
  isHalfDay: { type: Boolean, default: false },
  status: {
    type: String,
    enum: ["present", "absent", "weekend", "leave"],
    default: "absent",
  },
  leaveType: {
    type: String,
    enum: ["paid", "unpaid", "none"],
    default: "none",
  },
  regularized: { type: Boolean, default: false },

  // Geo-Location tracking
  loginLocation: {
    latitude: Number,
    longitude: Number,
  },
  logoutLocation: {
    latitude: Number,
    longitude: Number,
  },
});

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

export default mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);
