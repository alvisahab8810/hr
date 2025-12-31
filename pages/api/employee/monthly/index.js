import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const { employee, error } = await getEmployeeFromToken(req);
    if (error || !employee) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (employee.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const { employeeId, month } = req.query;
    if (!employeeId || !month) {
      return res
        .status(400)
        .json({ success: false, message: "employeeId and month required" });
    }

    const [year, mon] = month.split("-");
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59);

    const records = await Attendance.find({
      employee: employeeId,
      startTime: { $gte: startDate, $lte: endDate },
    }).lean();

    const LATE_HOUR = 10;
    const LATE_MIN = 10;
    const DUTY_END_HOUR = 18;

    const days = records.map((rec) => {
      const checkIn = rec.startTime ? new Date(rec.startTime) : null;
      const checkOut = rec.endTime ? new Date(rec.endTime) : null;

      let status = "Not Clocked In";

      if (checkIn) {
        const isLate =
          checkIn.getHours() > LATE_HOUR ||
          (checkIn.getHours() === LATE_HOUR &&
            checkIn.getMinutes() > LATE_MIN);

        status = isLate ? "Late" : "On Time";
      }

      // Missing checkout
      if (checkIn && !checkOut) {
        const now = new Date();
        if (
          now.toDateString() !== checkIn.toDateString() ||
          now.getHours() >= DUTY_END_HOUR
        ) {
          status = "Missing Checkout";
        }
      }

      return {
        date: checkIn
          ? checkIn.toISOString().split("T")[0]
          : rec.date,
        checkIn: checkIn
          ? checkIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "--",
        checkOut: checkOut
          ? checkOut.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "--",
        status,
      };
    });

    const summary = {
      totalDays: days.length,
      onTime: days.filter((d) => d.status === "On Time").length,
      late: days.filter((d) => d.status === "Late").length,
      missingCheckout: days.filter((d) => d.status === "Missing Checkout").length,
      notClockedIn: days.filter((d) => d.status === "Not Clocked In").length,
    };

    return res.json({
      success: true,
      summary,
      records: days,
    });
  } catch (err) {
    console.error("❌ Monthly attendance error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
