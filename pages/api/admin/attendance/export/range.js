// pages/api/admin/attendance/export/range.js
//
// Uses EXACT same model + field logic as your working APIs:
//   model:     @/models/employees/Attendance
//   employee:  @/models/hr/Employee
//   startTime  → check in
//   endTime    → check out
//   breaks[]   → lunch info
//   date       → YYYY-MM-DD string (regex match)
//   status:    startTime missing → "Absent", startTime after 10:10 → "Late", else "On Time"

import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { getEmployeeFromToken } from "@/utils/auth";

// ── Same lunch logic as your today/list.js and employee/monthly.js ────────────
function getLunchInfo(breaks = []) {
  const lunch = breaks?.find((b) => b.type === "lunch");
  if (!lunch) return { status: "--", duration: "--" };

  if (lunch.start && !lunch.end) {
    const mins = Math.floor((Date.now() - new Date(lunch.start)) / 60000);
    return { status: "On Lunch", duration: `${mins} min` };
  }

  if (lunch.start && lunch.end) {
    const mins = Math.floor((new Date(lunch.end) - new Date(lunch.start)) / 60000);
    return { status: "Lunch Taken", duration: `${mins} min` };
  }

  return { status: "--", duration: "--" };
}

// ── Same status logic as your today/list.js and employee/monthly.js ──────────
function resolveStatus(rec) {
  if (!rec || !rec.startTime) return "Absent";
  const t = new Date(rec.startTime);
  const isLate = t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
  return isLate ? "Late" : "On Time";
}

function fmtTime(d) {
  if (!d) return "--";
  try {
    return new Date(d).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch { return "--"; }
}

function fmtMins(mins) {
  if (!mins || mins <= 0) return "--";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getDayName(dateKey) {
  return new Date(dateKey + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" });
}

function safe(val) {
  const s = String(val ?? "--").trim();
  if (!s || s === "undefined" || s === "null") return "--";
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const { employee, error } = await getEmployeeFromToken(req);
    if (error || !employee || employee.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: "from and to are required" });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
      return res.status(400).json({ success: false, message: "Dates must be YYYY-MM-DD" });
    }
    if (from > to) {
      return res.status(400).json({ success: false, message: "from cannot be after to" });
    }

    // ── 1. Build all dates in range ──────────────────────────────────────────
    const allDates = [];
    const cur = new Date(from + "T00:00:00");
    const end = new Date(to   + "T00:00:00");
    while (cur <= end) {
      allDates.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }

    // ── 2. Fetch all active employees ────────────────────────────────────────
    const employees = await Employee.find({ isActive: true }).lean();

    // ── 3. Fetch all attendance records in range ─────────────────────────────
    // Your date field is YYYY-MM-DD string — use $gte/$lte which works on strings
    const records = await Attendance.find({
      employee: { $in: employees.map((e) => e._id) },
      date: { $gte: from, $lte: to },
    }).lean();

    // ── 4. Build lookup: "employeeId_date" → record ──────────────────────────
    const recMap = {};
    records.forEach((r) => {
      const key = `${r.employee.toString()}_${r.date}`;
      recMap[key] = r;
    });

    // ── 5. Build CSV rows ─────────────────────────────────────────────────────
    const headers = [
      "Date",
      "Day",
      "Employee ID",
      "Employee Name",
      "Department",
      "Designation",
      "Employee Type",
      "Employment Status",
      "Attendance Status",
      "Check In",
      "Check Out",
      "Work Hours",
      "Lunch",
      "Late Mark",
      "Half Day",
    ];

    const rows = [];

    for (const dateKey of allDates) {
      const dayName = getDayName(dateKey);
      const isWeekend = ["Saturday", "Sunday"].includes(dayName);

      for (const emp of employees) {
        const empObjId = emp._id.toString();
        const rec      = recMap[`${empObjId}_${dateKey}`] || null;

        const prof        = emp.professional || {};
        const fullName    = [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "Unknown";
        const empId       = emp.employeeId || "--";
        const department  = prof.department   || "--";
        const designation = prof.designation  || "--";
        const empType     = prof.employeeType || "--";
        const empStatus   = prof.status       || "--";

        // Determine status using EXACT same logic as your working APIs
        let statusText;
        if (rec?.startTime) {
          // Has a check-in — use time-based logic
          const t = new Date(rec.startTime);
          const isLate = t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
          statusText = isLate ? "Late" : "On Time";
        } else if (isWeekend) {
          statusText = "Week Off";
        } else {
          statusText = "Absent";
        }

        // Skip pure absent weekend rows (no value for HR)
        if (statusText === "Week Off" && !rec) continue;
        // Skip absent rows with no check-in (reduces clutter)
        // Keep if: present/late, leave, or weekend with actual record
        if (statusText === "Absent" && !rec) continue;

        // Check-in / Check-out
        const checkIn  = rec?.startTime ? fmtTime(rec.startTime) : "--";
        const checkOut = rec?.endTime   ? fmtTime(rec.endTime)   : "--";

        // Work hours from startTime → endTime
        let workHours = "--";
        if (rec?.startTime && rec?.endTime) {
          const mins = Math.round(
            (new Date(rec.endTime) - new Date(rec.startTime)) / 60000
          );
          if (mins > 0) workHours = fmtMins(mins);
        }

        // Lunch from breaks array
        const lunchInfo = getLunchInfo(rec?.breaks);
        const lunch     = lunchInfo.duration;

        // Late mark — after 10:10
        const lateMark = statusText === "Late" ? "Yes" : "No";

        // Half day — if rec has isHalfDay flag
        const halfDay = rec?.isHalfDay ? "Yes" : "No";

        rows.push([
          safe(dateKey),
          safe(dayName),
          safe(empId),
          safe(fullName),
          safe(department),
          safe(designation),
          safe(empType),
          safe(empStatus),
          safe(statusText),
          safe(checkIn),
          safe(checkOut),
          safe(workHours),
          safe(lunch),
          safe(lateMark),
          safe(halfDay),
        ].join(","));
      }
    }

    if (rows.length === 0) {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="attendance_${from}_to_${to}.csv"`);
      return res.status(200).send("\uFEFF" + headers.join(",") + "\nNo attendance records found for this period.\n");
    }

    const csv = [headers.join(","), ...rows].join("\n");

    const filename = `attendance_${from}_to_${to}.csv`;
    res.setHeader("Content-Type",        "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control",       "no-cache, no-store");

    return res.status(200).send("\uFEFF" + csv);

  } catch (err) {
    console.error("Attendance export range error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}