// // pages/api/payroll/attendance/punch-in.js
// import dbConnect from "@/utils/dbConnect";
// import { getEmployeeFromToken } from "@/utils/auth"; // you already have this
// import { getOrCreateTodayAttendance, recomputeAttendanceMetrics } from "@/utils/attendanceUtils";
// import Attendance from "@/models/payroll/Attendance";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();
//   await dbConnect();

//   const employee = await getEmployeeFromToken(req);
//   if (!employee)
//     return res.status(401).json({ success: false, message: "Unauthorized" });

//   const { latitude, longitude } = req.body || {};

//   try {
//     const att = await getOrCreateTodayAttendance(employee._id);

//     // If there is an open punch (last punch has no out), reject duplicate check-in
//     const punches = att.punches;
//     const last = punches[punches.length - 1];
//     if (last && !last.out) {
//       return res.status(400).json({ success: false, message: "Already checked in." });
//     }

//     // Add new punch
//     punches.push({ in: new Date() });

//     // Legacy sync (optional)
//     if (!att.loginTime) att.loginTime = new Date().toISOString();

//     recomputeAttendanceMetrics(att);
//     await att.save();

//     // Calculate break warning (gap from last punch out)
//     let breakWarn = null;
//     if (punches.length > 1) {
//       const prev = punches[punches.length - 2];
//       const gapMin = Math.round((new Date(punches[punches.length - 1].in) - new Date(prev.out)) / 60000);
//       if (gapMin > 45 && gapMin <= 50) breakWarn = `Lunch break exceeded 45m (${gapMin}m).`;
//       if (gapMin > 50) breakWarn = `Lunch break exceeded 50m (${gapMin}m). Extra time may be deducted.`;
//     }

//     return res.status(200).json({
//       success: true,
//       attendance: att,
//       breakWarn,
//     });
//   } catch (err) {
//     console.error("Punch-in error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }







// pages/api/payroll/attendance/punch-in.js
import dbConnect from "@/utils/dbConnect";
import { getEmployeeFromToken } from "@/utils/auth";
import { getOrCreateTodayAttendance, recomputeAttendanceMetrics } from "@/utils/attendanceUtils";
import Attendance from "@/models/payroll/Attendance";
import { HR_POLICY } from "@/config/hrPolicy"; // Added for late arrival policy

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromToken(req);
  if (!employee)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  const { latitude, longitude } = req.body || {};

  try {
    const att = await getOrCreateTodayAttendance(employee._id);

    // If there is an open punch (last punch has no out), reject duplicate check-in
    const punches = att.punches;
    const last = punches[punches.length - 1];
    if (last && !last.out) {
      return res.status(400).json({ success: false, message: "Already checked in." });
    }

    // Add new punch
    punches.push({ in: new Date(), location: { latitude, longitude } });

    // Legacy sync (optional)
    if (!att.loginTime) att.loginTime = new Date().toISOString();

    recomputeAttendanceMetrics(att);
    await att.save();

    // ---- LATE ARRIVAL CHECK ----
    const now = new Date();
    const [h, m] = HR_POLICY.lateArrival.graceTime.split(":").map(Number);
    const cutoff = new Date(now);
    cutoff.setHours(h, m, 0, 0);

    if (now > cutoff) {
      att.lateMark = true; // Add lateMark flag
      await att.save();
    }
    // --------------------------------

    // Calculate break warning (gap from last punch out)
    let breakWarn = null;
    if (punches.length > 1) {
      const prev = punches[punches.length - 2];
      const gapMin = Math.round(
        (new Date(punches[punches.length - 1].in) - new Date(prev.out)) / 60000
      );
      if (gapMin > 45 && gapMin <= 50) breakWarn = `Lunch break exceeded 45m (${gapMin}m).`;
      if (gapMin > 50) breakWarn = `Lunch break exceeded 50m (${gapMin}m). Extra time may be deducted.`;
    }

    return res.status(200).json({
      success: true,
      attendance: att,
      breakWarn,
    });
  } catch (err) {
    console.error("Punch-in error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
