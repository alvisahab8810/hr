import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

// Convert IST hour:minute on a date string to a UTC Date object
function istTimeToDate(dateStr, hour, minute) {
  const [year, month, day] = dateStr.split("-").map(Number);
  let utcMinute = minute - 30;
  let utcHour = hour - 5;
  if (utcMinute < 0) {
    utcMinute += 60;
    utcHour -= 1;
  }
  if (utcHour < 0) utcHour += 24;
  return new Date(Date.UTC(year, month - 1, day, utcHour, utcMinute, 0, 0));
}

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();

  try {
    await dbConnect();

    const admin = await getAdminFromReq(req, res);
    if (!admin) return;

    const { employeeId, date, hour, minute } = req.body;

    if (!employeeId || !date || hour === undefined || minute === undefined) {
      return res.status(400).json({
        success: false,
        message: "employeeId, date, hour and minute are required",
      });
    }

    // Find employee by their string employeeId (e.g. "VN1012")
    const emp = await Employee.findOne({ employeeId }).lean();
    if (!emp) {
      return res.status(404).json({
        success: false,
        message: `Employee ${employeeId} not found`,
      });
    }

    // Find today's attendance record
    const attendance = await Attendance.findOne({
      employee: emp._id,
      date,
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: `No attendance record found for ${employeeId} on ${date}`,
      });
    }

    const lunchEndTime = istTimeToDate(date, hour, minute);

    // Look for an open lunch break (start without end)
    const openLunch = attendance.breaks.find(
      (b) => b.type === "lunch" && b.start && !b.end
    );

    if (openLunch) {
      openLunch.end = lunchEndTime;
    } else {
      // No open lunch break — add a completed one (use start = end - 45 min)
      const lunchStartTime = new Date(lunchEndTime.getTime() - 45 * 60 * 1000);
      attendance.breaks.push({
        type: "lunch",
        start: lunchStartTime,
        end: lunchEndTime,
      });
    }

    // If employee was stuck in "on_break" status, restore to clocked_in
    if (attendance.status === "on_break") {
      attendance.status = "clocked_in";
    }

    await attendance.save();

    const updatedLunch = attendance.breaks.find((b) => b.type === "lunch");

    return res.json({
      success: true,
      message: `Lunch break fixed for ${employeeId} on ${date}`,
      lunch: {
        start: updatedLunch?.start,
        end: updatedLunch?.end,
      },
    });
  } catch (err) {
    console.error("Fix lunch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
