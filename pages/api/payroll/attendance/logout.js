// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/payroll/Attendance";
// import { getTodayDate, getCurrentTime } from "@/utils/time";
// import { getEmployeeFromToken } from "@/utils/auth";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();
//   const employee = await getEmployeeFromToken(req);

//   const today = getTodayDate();

//   const attendance = await Attendance.findOne({ employee: employee._id, date: today });

//   if (!attendance || !attendance.loginTime) {
//     return res.status(400).json({ success: false, message: "Login first" });
//   }

//   if (attendance.logoutTime) {
//     return res.status(400).json({ success: false, message: "Already logged out" });
//   }

//   attendance.logoutTime = getCurrentTime();
//   await attendance.save();

//   res.status(200).json({ success: true, logoutTime: attendance.logoutTime });
// }




// // pages/api/payroll/attendance/logout.js

// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/payroll/Attendance";
// import { getTodayDate, getCurrentTime } from "@/utils/time";
// import { getEmployeeFromToken } from "@/utils/auth";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();
//   const employee = await getEmployeeFromToken(req);
//   const today = getTodayDate();

//   const attendance = await Attendance.findOne({ employee: employee._id, date: today });

//   if (!attendance || !attendance.loginTime) {
//     return res.status(400).json({ success: false, message: "Login first" });
//   }

//   if (attendance.logoutTime) {
//     return res.status(400).json({ success: false, message: "Already logged out" });
//   }

//   const logoutTime = new Date(); // Actual logout
//   const loginTime = new Date(attendance.loginTime);

//   const workedMs = logoutTime - loginTime;
//   const workedHrs = workedMs / (1000 * 60 * 60); // convert ms to hours

//   attendance.logoutTime = logoutTime.toISOString();

//   // Define rules — adjust thresholds if needed
//   if (workedHrs >= 7.5) {
//     attendance.status = "present";
//     attendance.isHalfDay = false;
//   } else if (workedHrs >= 4) {
//     attendance.status = "present";
//     attendance.isHalfDay = true;
//   } else {
//     attendance.status = "absent";
//     attendance.isHalfDay = false;
//   }

//   await attendance.save();

//   res.status(200).json({
//     success: true,
//     logoutTime: attendance.logoutTime,
//     status: attendance.status,
//     isHalfDay: attendance.isHalfDay,
//   });
// }








// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/payroll/Attendance";
// import { getTodayDate } from "@/utils/time";
// import { getEmployeeFromToken } from "@/utils/auth";

// function msToMinutes(ms) {
//   return Math.round(ms / 60000);
// }

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();
//   const employee = await getEmployeeFromToken(req);
//   if (!employee) {
//     return res.status(401).json({ success: false, message: "Unauthorized" });
//   }

//   const today = getTodayDate();
//   const att = await Attendance.findOne({ employee: employee._id, date: today });

//   if (!att) {
//     return res.status(400).json({ success: false, message: "No login found." });
//   }

//   // Find open punch
//   const lastPunch = att.punches[att.punches.length - 1];
//   const now = new Date();

//   if (!lastPunch || lastPunch.out) {
//     // Already clocked out
//     return res
//       .status(400)
//       .json({ success: false, message: "Already clocked out." });
//   }

//   // Close the punch
//   lastPunch.out = now;
//   att.logoutTime = now; // legacy

//   // Compute totals
//   let totalWorkedMs = 0;
//   let totalBreakMs = 0;
//   let longestBreakMs = 0;

//   for (let i = 0; i < att.punches.length; i++) {
//     const p = att.punches[i];
//     if (p.in && p.out) {
//       totalWorkedMs += p.out - p.in;
//     }
//     // break = time between this out and next in
//     if (i < att.punches.length - 1) {
//       const next = att.punches[i + 1];
//       if (p.out && next.in) {
//         const gap = next.in - p.out;
//         totalBreakMs += gap;
//         if (gap > longestBreakMs) longestBreakMs = gap;
//       }
//     }
//   }

//   att.totalWorkedMinutes = msToMinutes(totalWorkedMs);
//   att.totalBreakMinutes = msToMinutes(totalBreakMs);
//   att.longestBreakMinutes = msToMinutes(longestBreakMs);
//   att.lunchBreakExceeded = att.longestBreakMinutes > 50; // your rule

//   // Day classification (worked time only)
//   const workedHrs = att.totalWorkedMinutes / 60;
//   if (workedHrs >= 7.5) {
//     att.status = "present";
//     att.isHalfDay = false;
//   } else if (workedHrs >= 4) {
//     att.status = "present";
//     att.isHalfDay = true;
//   } else {
//     att.status = "absent";
//     att.isHalfDay = false;
//   }

//   await att.save();

//   res.status(200).json({
//     success: true,
//     logoutTime: att.logoutTime,
//     workedMinutes: att.totalWorkedMinutes,
//     breakMinutes: att.totalBreakMinutes,
//     lunchBreakExceeded: att.lunchBreakExceeded,
//     status: att.status,
//     isHalfDay: att.isHalfDay,
//   });
// }







import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/payroll/Attendance";
import { getTodayDate } from "@/utils/time";
import { getEmployeeFromToken } from "@/utils/auth";

function msToMinutes(ms) {
  return Math.max(0, Math.round(ms / 60000));
}

function computeTotals(att) {
  let workedMs = 0;
  let breakMs = 0;
  let longestBreakMs = 0;
  const punches = att.punches || [];

  // worked
  for (let i = 0; i < punches.length; i++) {
    const p = punches[i];
    if (p.in && p.out) workedMs += new Date(p.out) - new Date(p.in);
    // gaps
    if (i < punches.length - 1) {
      const gap = new Date(punches[i + 1].in) - new Date(p.out || punches[i].in);
      if (gap > 0) {
        breakMs += gap;
        if (gap > longestBreakMs) longestBreakMs = gap;
      }
    }
  }

  att.totalWorkedMinutes = msToMinutes(workedMs);
  att.totalBreakMinutes = msToMinutes(breakMs);
  att.longestBreakMinutes = msToMinutes(longestBreakMs);
  att.lunchBreakExceeded = att.longestBreakMinutes > 50; // your rule

  // classify day
  const workedHrs = att.totalWorkedMinutes / 60;
  if (workedHrs >= 7.5) {
    att.status = "present";
    att.isHalfDay = false;
  } else if (workedHrs >= 4) {
    att.status = "present";
    att.isHalfDay = true;
  } else {
    att.status = "absent";
    att.isHalfDay = false;
  }

  // legacy logout
  const last = punches[punches.length - 1];
  if (last?.out) att.logoutTime = last.out;
}

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
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromToken(req);
  if (!employee)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const today = getTodayDate();
  const att = await Attendance.findOne({ employee: employee._id, date: today });

  if (!att) {
    return res.status(400).json({ success: false, message: "No login found." });
  }

  const punches = att.punches || [];
  const lastPunch = punches[punches.length - 1];
  if (!lastPunch || lastPunch.out) {
    return res.status(400).json({
      success: false,
      message: "Already clocked out.",
      attendance: serializeAttendance(att),
    });
  }

  lastPunch.out = new Date(); // close punch
  computeTotals(att);
  await att.save();

  return res.status(200).json({
    success: true,
    attendance: serializeAttendance(att),
  });
}
