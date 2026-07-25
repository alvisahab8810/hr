import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Holiday from "@/models/Holiday";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { buildMonthDates, getTodayStr, countElapsedWorkingDays, toDateStr } from "@/utils/payroll/generateSalaryForMonth";

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

    const [yearStr, monthStr] = month.split("-");
    const year  = Number(yearStr);
    const mon0  = Number(monthStr) - 1; // 0-indexed

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

    // ── Elapsed working days this month (Mon-Sat, excl. Sundays/holidays, 3rd Sat = half) ──
    const monthStart = new Date(year, mon0, 1);
    const monthEnd   = new Date(year, mon0 + 1, 1);
    const holidays = await Holiday.find({
      isActive: true,
      type: "public",
      startDate: { $lt: monthEnd },
      endDate:   { $gte: monthStart },
    }).lean();
    const holidayDates = new Set();
    holidays.forEach((h) => {
      const start = new Date(Math.max(new Date(h.startDate), monthStart));
      const end   = new Date(Math.min(new Date(h.endDate), new Date(monthEnd - 1)));
      const cur   = new Date(start);
      while (cur <= end) {
        holidayDates.add(toDateStr(cur));
        cur.setDate(cur.getDate() + 1);
      }
    });
    const allDates = buildMonthDates(year, mon0);
    const todayStr = getTodayStr();
    const lastDayStr = `${year}-${String(mon0 + 1).padStart(2, "0")}-${String(new Date(year, mon0 + 1, 0).getDate()).padStart(2, "0")}`;
    const isCurrentMonth = todayStr.startsWith(`${year}-${String(mon0 + 1).padStart(2, "0")}`);
    const elapsedWorkingDays = countElapsedWorkingDays(allDates, holidayDates, isCurrentMonth ? todayStr : lastDayStr);

    const totalWorkMin = filtered.reduce((sum, rec) => sum + Math.round(rec.totalWorkedMs() / 60000), 0);

    const summary = {
      present: days.length,
      onTime: days.filter((d) => d.status === "On Time").length,
      late: days.filter((d) => d.status === "Late").length,
      absent: Math.max(0, Math.round(elapsedWorkingDays - days.length)),
      totalWorkedHours: `${String(Math.floor(totalWorkMin / 60)).padStart(2, "0")}:${String(totalWorkMin % 60).padStart(2, "0")}`,
    };

    return res.json({ success: true, days, summary });
  } catch (err) {
    console.error("❌ Employee monthly error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
