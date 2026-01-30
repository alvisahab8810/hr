import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { getEmployeeFromToken } from "@/utils/auth";

/* ---------- SAME LUNCH LOGIC AS TODAY ---------- */
function getLunchInfo(breaks = []) {
  const lunch = breaks.find((b) => b.type === "lunch");
  if (!lunch) return { status: "--", duration: "--" };

  if (lunch.start && !lunch.end) {
    const mins = Math.floor(
      (Date.now() - new Date(lunch.start)) / 60000
    );
    return { status: "On Lunch", duration: `${mins} min` };
  }

  if (lunch.start && lunch.end) {
    const mins = Math.floor(
      (new Date(lunch.end) - new Date(lunch.start)) / 60000
    );
    return { status: "Lunch Taken", duration: `${mins} min` };
  }

  return { status: "--", duration: "--" };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();

  const { employee, error } = await getEmployeeFromToken(req);
  if (error || !employee || employee.role !== "admin") {
    return res.status(401).json({ success: false });
  }

  const { employeeId, month } = req.query;
  if (!employeeId || !month) {
    return res.status(400).json({ success: false });
  }

  const emp = await Employee.findById(employeeId).lean();
  if (!emp) {
    return res.status(404).json({ success: false });
  }

  const records = await Attendance.find({
    employee: employeeId,
    date: { $regex: `^${month}` },
  }).lean();

  const days = {};

  records.forEach((r) => {
    const lunchInfo = getLunchInfo(r.breaks);

    // 🔥 SAME STATUS RULE AS TODAY LIST
    let statusText = "Absent";
    if (r.startTime) {
      const t = new Date(r.startTime);
      const isLate =
        t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
      statusText = isLate ? "Late" : "On Time";
    }

    days[r.date] = {
      status: statusText,
      checkIn: r.startTime,
      checkOut: r.endTime,
      lunch: lunchInfo.duration,
      lunchStatus: lunchInfo.status,
    };
  });

  return res.json({
    success: true,
    employee: {
      name: `${emp.firstName} ${emp.lastName}`,
      designation: emp.professional?.designation,
      type: emp.professional?.employeeType,
    },
    days,
  });
}
