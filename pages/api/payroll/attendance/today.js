// // pages/api/payroll/attendance/today.js

// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/payroll/Attendance";
// import { getEmployeeFromToken } from "@/utils/auth";
// import { getTodayDate } from "@/utils/time";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   await dbConnect();

//   const employee = await getEmployeeFromToken(req);
//   if (!employee)
//     return res.status(401).json({ success: false, message: "Unauthorized" });

//   const today = getTodayDate();

//   const attendanceDoc = await Attendance.findOne({
//     employee: employee._id,
//     date: today,
//   });

//   if (!attendanceDoc) {
//     return res.status(200).json({ success: true, attendance: null });
//   }

//   // Safe conversion with null checks
//   const loginTimeValid =
//     attendanceDoc.loginTime && !isNaN(new Date(attendanceDoc.loginTime));
//   const logoutTimeValid =
//     attendanceDoc.logoutTime && !isNaN(new Date(attendanceDoc.logoutTime));

//   res.status(200).json({
//     success: true,
//     attendance: {
//       loginTime: loginTimeValid
//         ? new Date(attendanceDoc.loginTime).toISOString()
//         : null,
//       logoutTime: logoutTimeValid
//         ? new Date(attendanceDoc.logoutTime).toISOString()
//         : null,
//     },
//   });
// }












// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/payroll/Attendance";
// import { getEmployeeFromToken } from "@/utils/auth";
// import { getTodayDate } from "@/utils/time";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   await dbConnect();
//   const employee = await getEmployeeFromToken(req);
//   if (!employee)
//     return res.status(401).json({ success: false, message: "Unauthorized" });

//   const today = getTodayDate();
//   const att = await Attendance.findOne({ employee: employee._id, date: today });

//   if (!att) {
//     return res.status(200).json({ success: true, attendance: null });
//   }

//   return res.status(200).json({
//     success: true,
//     attendance: {
//       _id: att._id,
//       date: att.date,
//       loginTime: att.loginTime,
//       logoutTime: att.logoutTime,
//       punches: att.punches,
//       totalWorkedMinutes: att.totalWorkedMinutes,
//       totalBreakMinutes: att.totalBreakMinutes,
//       longestBreakMinutes: att.longestBreakMinutes,
//       lunchBreakExceeded: att.lunchBreakExceeded,
//       status: att.status,
//       isHalfDay: att.isHalfDay,
//     },
//   });
// }



import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/payroll/Attendance";
import { getEmployeeFromToken } from "@/utils/auth";
import { getTodayDate } from "@/utils/time";

function serializeAttendance(att) {
  if (!att) return null;
  return {
    _id: att._id.toString(),
    employee: att.employee?.toString?.() ?? att.employee,
    date: att.date,
    loginTime: att.loginTime || null,
    logoutTime: att.logoutTime || null,
    status: att.status,
    isHalfDay: att.isHalfDay,
    totalWorkedMinutes: att.totalWorkedMinutes ?? 0,
    totalBreakMinutes: att.totalBreakMinutes ?? 0,
    longestBreakMinutes: att.longestBreakMinutes ?? 0,
    lunchBreakExceeded: !!att.lunchBreakExceeded,
    punches: att.punches?.map((p) => ({
      in: p.in ? p.in.toISOString() : null,
      out: p.out ? p.out.toISOString() : null,
    })) ?? [],
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromToken(req);
  if (!employee)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const today = getTodayDate();
  const att = await Attendance.findOne({ employee: employee._id, date: today });

  return res.status(200).json({
    success: true,
    attendance: serializeAttendance(att),
  });
}
