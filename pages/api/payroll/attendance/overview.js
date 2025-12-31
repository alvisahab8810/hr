import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/payroll/Employee";
import Attendance from "@/models/payroll/Attendance";
import LeaveRequest from "@/models/payroll/LeaveRequest";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();

  try {
    const today = new Date();

    // Get today's start and end time
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    // Total Employees
    const totalEmployees = await Employee.countDocuments();

    // Employees Checked In Today
    const checkedIn = await Attendance.countDocuments({
      date: startOfDay.toISOString().split("T")[0], // still matches YYYY-MM-DD in Attendance
      loginTime: { $ne: null },
    });

    // Employees on Leave Today (Approved)
    const leaveTaken = await LeaveRequest.countDocuments({
      status: "Approved",
      from: { $lte: endOfDay }, // leave starts before end of today
      to: { $gte: startOfDay }, // leave ends after start of today
    });

    // Yet to Check-In = total - checkedIn - leaveTaken
    const yetToCheckIn = Math.max(totalEmployees - checkedIn - leaveTaken, 0);

    return res.status(200).json({
      success: true,
      summary: {
        total: totalEmployees,
        checkedIn,
        yetToCheckIn,
        leaveTaken,
      },
    });
  } catch (err) {
    console.error("Overview API Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
