import mongoose from "mongoose";

// ---------------- BREAK SCHEMA ----------------
const BreakSchema = new mongoose.Schema({
  start: Date,
  end: Date,
  type: {
    type: String,
    enum: ["lunch", "short", "break"],
    default: "break",
  },
});

// ---------------- ATTENDANCE SCHEMA ----------------
const AttendanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    date: { type: String, required: true },

    startTime: Date,
    endTime: Date,

    breaks: [BreakSchema],

    /* ---------- LATE LOGIC ---------- */
    isLate: { type: Boolean, default: false },       // UI / display
    lateMarked: { type: Boolean, default: false },   // payroll logic
    latePenaltyApplied: { type: Boolean, default: false },
    latePenaltyAmount: { type: Number, default: 0 },

    /* ---------- DEDUCTIONS ---------- */
    deductions: { type: Number, default: 0 },        // lunch / others

    /* ---------- STATUS ---------- */
    status: {
      type: String,
      enum: ["clocked_in", "on_break", "clocked_out"],
      default: "clocked_in",
    },
  },
  { timestamps: true }
);

// ---------------- METHODS ----------------
AttendanceSchema.methods.totalBreakMs = function () {
  let total = 0;

  (this.breaks || []).forEach((b) => {
    if (b.start && b.end) {
      total += new Date(b.end) - new Date(b.start);
    } else if (b.start && !b.end) {
      total += new Date() - new Date(b.start);
    }
  });

  return total;
};

AttendanceSchema.methods.totalWorkedMs = function () {
  if (!this.startTime) return 0;

  const end = this.endTime ? new Date(this.endTime) : new Date();
  const raw = end - new Date(this.startTime);

  return raw - this.totalBreakMs();
};

// ---------------- FORCE RECOMPILE ----------------
if (mongoose.models.Attendance) {
  delete mongoose.connection.models.Attendance;
}

export default mongoose.model("Attendance", AttendanceSchema);
