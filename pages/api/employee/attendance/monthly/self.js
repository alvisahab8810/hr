import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ SAME AUTH AS CLOCK-IN
    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({ success: false, message: "Month required" });
    }

    // ✅ THIS WILL NOW MATCH DB RECORDS
    const records = await Attendance.find({
      employee: employee._id,
    });

    const filtered = records.filter(
      (rec) => rec.date && rec.date.startsWith(month)
    );

    const LATE_HOUR = 10;
    const LATE_MIN = 10;

    const days = filtered.map((rec) => {
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

      const breakMin = Math.round(rec.totalBreakMs() / 60000);
      const workMin = Math.round(rec.totalWorkedMs() / 60000);

      return {
        date: rec.date,
        checkIn: inTime
          ? inTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "--",
        checkOut: outTime
          ? outTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "--",
        break: `${breakMin} Min`,
        workingHours: `${String(Math.floor(workMin / 60)).padStart(2, "0")}:${String(
          workMin % 60
        ).padStart(2, "0")}`,
        status,
      };
    });

    const summary = {
      present: days.length,
      onTime: days.filter((d) => d.status === "On Time").length,
      late: days.filter((d) => d.status === "Late").length,
      absent: 0,
    };

    return res.json({ success: true, days, summary });
  } catch (err) {
    console.error("❌ Employee monthly error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
