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

    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ success: false, message: "Month required" });
    }

    const [year, mon] = month.split("-");
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 0, 23, 59, 59);

    const records = await Attendance.find({
      employee: employee._id,
      startTime: { $gte: startDate, $lte: endDate },
    }).lean();

    const LATE_HOUR = 10;
    const LATE_MIN = 10;

    const days = records.map((rec) => {
      const inTime = rec.startTime ? new Date(rec.startTime) : null;
      const outTime = rec.endTime ? new Date(rec.endTime) : null;

      let status = "Absent";
      if (inTime) {
        const isLate =
          inTime.getHours() > LATE_HOUR ||
          (inTime.getHours() === LATE_HOUR &&
            inTime.getMinutes() > LATE_MIN);
        status = isLate ? "Late" : "On Time";
      }

      const breakMin = Math.round((rec.totalBreakMs?.() || 0) / 60000);
      const workMin = Math.round((rec.totalWorkedMs?.() || 0) / 60000);

      return {
        date: inTime
          ? inTime.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—",
        checkIn: inTime
          ? inTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "--",
        checkOut: outTime
          ? outTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "--",
        break: `${breakMin} Min`,
        workingHours: `${Math.floor(workMin / 60)
          .toString()
          .padStart(2, "0")}:${(workMin % 60)
          .toString()
          .padStart(2, "0")} Hrs`,
        status,
      };
    });

    const summary = {
      present: days.filter((d) => d.status !== "Absent").length,
      late: days.filter((d) => d.status === "Late").length,
      absent: days.filter((d) => d.status === "Absent").length,
      onTime: days.filter((d) => d.status === "On Time").length,
    };

    return res.json({ success: true, days, summary });
  } catch (err) {
    console.error("❌ Employee monthly error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
