// // lib/attendanceUtils.js
// import Attendance from "@/models/payroll/Attendance";
// import { getTodayDate } from "@/utils/time";

// // recompute totals each time we close a punch or add one
// export function recomputeAttendanceMetrics(att) {
//   let worked = 0;
//   let prevOut = null;
//   let totalBreak = 0;
//   let longestBreak = 0;

//   att.punches.forEach((p, idx) => {
//     if (p.out) {
//       const ms = new Date(p.out) - new Date(p.in);
//       worked += ms;
//       prevOut = new Date(p.out);
//     } else {
//       // active punch -> count time until now?
//       // For totals we usually skip active in-progress punch; front-end can compute live.
//     }

//     // break (gap) between punches
//     if (idx > 0) {
//       const prevPunch = att.punches[idx - 1];
//       if (prevPunch.out) {
//         const gapMs = new Date(p.in) - new Date(prevPunch.out);
//         if (gapMs > 0) {
//           const gapMin = Math.round(gapMs / 60000);
//           totalBreak += gapMin;
//           if (gapMin > longestBreak) longestBreak = gapMin;
//         }
//       }
//     }
//   });

//   att.totalWorkedMinutes = Math.round(worked / 60000);
//   att.totalBreakMinutes = totalBreak;
//   att.longestBreakMinutes = longestBreak;
//   att.lunchBreakExceeded = longestBreak > 50; // >45 + 5 grace
// }

// export async function getOrCreateTodayAttendance(employeeId) {
//   const date = getTodayDate();
//   let att = await Attendance.findOne({ employee: employeeId, date });
//   if (!att) {
//     att = await Attendance.create({
//       employee: employeeId,
//       date,
//       status: "present", // mark present on first punch
//       punches: [],
//     });
//   }
//   return att;
// }
