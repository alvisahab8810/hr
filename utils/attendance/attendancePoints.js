// utils/attendance/attendancePoints.js
//
// Attendance points (0-5) and the combined Overall score shown alongside a
// task grade. Reuses gradeTask.js's pointsToGrade() for the letter/colour
// bands so a "3.4" reads the same way (same letter, same colour) whether it
// came from task punctuality, attendance, or the overall average.

import { pointsToGrade } from "@/utils/tasks/gradeTask";

// Starts at full marks; -0.1 per late day, -0.5 per absent day, floored at 0.
export function calcAttendancePoints({ late = 0, absent = 0 } = {}) {
  const score = Math.max(0, Math.min(5, Math.round((5 - late * 0.1 - absent * 0.5) * 10) / 10));
  return { score, grade: pointsToGrade(score) };
}

// Simple average of whichever categories are actually available this month —
// a category with no data yet (e.g. Personal Development not set) is left
// out of the average rather than counted as a zero.
export function calcOverallScore(parts) {
  const vals = parts.filter(v => typeof v === "number" && !Number.isNaN(v));
  if (!vals.length) return { score: null, grade: pointsToGrade(null) };
  const score = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
  return { score, grade: pointsToGrade(score) };
}
