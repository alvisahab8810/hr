// utils/attendanceDb.js
import Attendance from "@/models/payroll/Attendance";
import { LUNCH_BREAK_WARN_MIN, FULL_DAY_MIN, HALF_DAY_MIN } from "./attendanceRules.js";

/**
 * Return attendance doc for employee+date; create if missing.
 */
export async function getOrCreateAttendance(employeeId, date) {
  let doc = await Attendance.findOne({ employee: employeeId, date });
  if (!doc) {
    doc = await Attendance.create({
      employee: employeeId,
      date,
      status: "absent", // will re-evaluate later
      punches: [],
    });
  }
  return doc;
}

/**
 * Recalculate totals & flags based on punches.
 * Mutates the doc object you pass (not yet saved).
 */
export function recomputeAttendanceStats(doc) {
  if (!doc.punches?.length) {
    doc.totalWorkedMinutes = 0;
    doc.totalBreakMinutes = 0;
    doc.longestBreakMinutes = 0;
    doc.lunchBreakExceeded = false;
    doc.isHalfDay = false;
    doc.status = "absent";
    return;
  }

  // sort punches by IN
  const punches = [...doc.punches].sort((a,b)=>new Date(a.in)-new Date(b.in));

  // worked
  let worked = 0;
  punches.forEach(p => {
    if (p.out) {
      worked += Math.max(0, (new Date(p.out) - new Date(p.in)) / 60000);
    }
  });

  // breaks (gap between OUT and next IN)
  let breaks = 0;
  let longest = 0;
  for (let i = 0; i < punches.length - 1; i++) {
    const curr = punches[i];
    const next = punches[i+1];
    if (curr.out && next.in) {
      const gap = Math.max(0, (new Date(next.in) - new Date(curr.out)) / 60000);
      breaks += gap;
      if (gap > longest) longest = gap;
    }
  }

  doc.totalWorkedMinutes = Math.round(worked);
  doc.totalBreakMinutes = Math.round(breaks);
  doc.longestBreakMinutes = Math.round(longest);
  doc.lunchBreakExceeded = longest > LUNCH_BREAK_WARN_MIN;

  // derive summary status
  if (worked >= FULL_DAY_MIN) {
    doc.status = "present";
    doc.isHalfDay = false;
  } else if (worked >= HALF_DAY_MIN) {
    doc.status = "present";
    doc.isHalfDay = true;
  } else if (worked > 0) {
    doc.status = "absent"; // worked but < half day threshold
    doc.isHalfDay = false;
  } else {
    doc.status = "absent";
    doc.isHalfDay = false;
  }
}
