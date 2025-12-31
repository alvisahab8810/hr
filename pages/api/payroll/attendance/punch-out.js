// pages/api/payroll/attendance/punch-out.js
import dbConnect from "@/utils/dbConnect";
import { getEmployeeFromToken } from "@/utils/auth";
import { getOrCreateTodayAttendance, recomputeAttendanceMetrics } from "@/utils/attendanceUtils";
import Attendance from "@/models/payroll/Attendance";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromToken(req);
  if (!employee)
    return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    const att = await getOrCreateTodayAttendance(employee._id);

    // Must have open punch
    const punches = att.punches;
    const last = punches[punches.length - 1];
    if (!last || last.out) {
      return res.status(400).json({ success: false, message: "Not currently checked in." });
    }

    last.out = new Date();

    // Legacy sync
    att.logoutTime = last.out.toISOString();

    recomputeAttendanceMetrics(att);
    await att.save();

    return res.status(200).json({
      success: true,
      attendance: att,
    });
  } catch (err) {
    console.error("Punch-out error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
