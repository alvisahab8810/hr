// // ============================= this is old api ==========================





// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/payroll/Attendance";
// import { getTodayDate } from "@/utils/time";
// import { getEmployeeFromToken } from "@/utils/auth";
// import { HR_POLICY } from "@/config/hrPolicy";

// // serialize helper
// function serializeAttendance(att) {
//   if (!att) return null;
//   return {
//     _id: att._id.toString(),
//     employee: att.employee?.toString?.() ?? att.employee,
//     date: att.date,
//     loginTime: att.loginTime || null,
//     logoutTime: att.logoutTime || null,
//     status: att.status,
//     isHalfDay: att.isHalfDay,
//     totalWorkedMinutes: att.totalWorkedMinutes ?? 0,
//     totalBreakMinutes: att.totalBreakMinutes ?? 0,
//     longestBreakMinutes: att.longestBreakMinutes ?? 0,
//     lunchBreakExceeded: !!att.lunchBreakExceeded,
//     lateMark: !!att.lateMark,
//     punches:
//       att.punches?.map((p) => ({
//         in: p.in ? p.in.toISOString() : null,
//         out: p.out ? p.out.toISOString() : null,
//       })) ?? [],
//   };
// }

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();
//   await dbConnect();

//   const employee = await getEmployeeFromToken(req);
//   if (!employee) {
//     return res.status(401).json({ success: false, message: "Unauthorized" });
//   }

//   const { latitude, longitude } = req.body || {};
//   const today = getTodayDate();
//   const now = new Date();

//   try {
//     let att = await Attendance.findOne({ employee: employee._id, date: today });

//     if (!att) {
//       // First punch of the day
//       att = await Attendance.create({
//         employee: employee._id,
//         date: today,
//         loginTime: now,
//         status: "present",
//         leaveType: "none",
//         punches: [{ in: now }],
//         loginLocation: { latitude, longitude },
//       });

//       // ---- Late Arrival Check ----
//       const [h, m] = HR_POLICY.lateArrival.graceTime.split(":").map(Number);
//       const cutoff = new Date(now);
//       cutoff.setHours(h, m, 0, 0);

//       if (now > cutoff) {
//         att.lateMark = true;
//         await att.save();
//       }
//       // ----------------------------
//     } else {
//       // If last punch not closed but duty hours done → auto punch-out
//       const lastPunch = att.punches[att.punches.length - 1];
//       if (lastPunch && !lastPunch.out) {
//         const startTime = new Date(lastPunch.in);
//         const workedMinutes = Math.floor((now - startTime) / 60000);

//         if (workedMinutes >= 8 * 60) {
//           lastPunch.out = new Date(startTime.getTime() + 8 * 60 * 60000);
//           await att.save();
//           return res.status(200).json({
//             success: true,
//             message: "Auto punch-out applied due to completion of duty hours.",
//             attendance: serializeAttendance(att),
//           });
//         }

//         return res.status(400).json({
//           success: false,
//           message: "Already clocked in.",
//           attendance: serializeAttendance(att),
//         });
//       }

//       // New punch-in
//       att.punches.push({ in: now, out: null });
//       att.status = "present";
//       if (!att.loginTime) att.loginTime = now;
//       att.loginLocation = { latitude, longitude };
//       await att.save();
//     }

//     return res.status(200).json({
//       success: true,
//       attendance: serializeAttendance(att),
//     });
//   } catch (error) {
//     console.error("Login punch-in error:", error);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }













// ================================= this is new api =============================




// pages/api/payroll/attendance/login.js
import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/payroll/Attendance";
import { getTodayDate } from "@/utils/time";
import { getEmployeeFromToken } from "@/utils/auth";
import { HR_POLICY } from "@/config/hrPolicy";

// Helper to serialize attendance for API response
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
    lateMark: !!att.lateMark,
    punches:
      att.punches?.map((p) => ({
        in: p.in ? p.in.toISOString() : null,
        out: p.out ? p.out.toISOString() : null,
      })) ?? [],
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();

  try {
    // ✅ Get employee from token
    const { employee, error } = await getEmployeeFromToken(req);
    if (error || !employee) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { latitude, longitude } = req.body || {};
    const today = getTodayDate();
    const now = new Date();

    // Find today's attendance
    let att = await Attendance.findOne({ employee: employee._id, date: today });

    if (!att) {
      // First punch of the day
      att = await Attendance.create({
        employee: employee._id,
        date: today,
        loginTime: now,
        status: "present",
        leaveType: "none",
        punches: [{ in: now }],
        loginLocation: { latitude, longitude },
      });

      // Late Arrival Check
      const [h, m] = HR_POLICY.lateArrival.graceTime.split(":").map(Number);
      const cutoff = new Date(now);
      cutoff.setHours(h, m, 0, 0);
      if (now > cutoff) {
        att.lateMark = true;
        await att.save();
      }
    } else {
      // Additional punch logic
      const lastPunch = att.punches[att.punches.length - 1];
      if (lastPunch && !lastPunch.out) {
        lastPunch.out = now;
        att.logoutTime = now;
        att.punches[att.punches.length - 1] = lastPunch;
        await att.save();
      } else {
        // New punch-in
        att.punches.push({ in: now });
        if (!att.loginTime) att.loginTime = now;
        att.status = "present";
        att.loginLocation = { latitude, longitude };
        await att.save();
      }
    }

    return res.status(200).json({
      success: true,
      attendance: serializeAttendance(att),
    });
  } catch (err) {
    console.error("Login punch-in error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
