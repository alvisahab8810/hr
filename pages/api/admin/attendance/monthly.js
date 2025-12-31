import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false });
  }

  try {
    await dbConnect();

    const admin = await getAdminFromReq(req, res);
    if (!admin) {
      return res.status(401).json({ success: false });
    }

    const { month } = req.query; // YYYY-MM
    if (!month) {
      return res.status(400).json({
        success: false,
        message: "Month is required (YYYY-MM)",
      });
    }

    const start = new Date(`${month}-01`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    // ✅ ACTIVE EMPLOYEES ONLY
    const employees = await Employee.find({ isActive: true }).lean();

    const attendance = await Attendance.find({
      employee: { $in: employees.map((e) => e._id) },
      createdAt: { $gte: start, $lt: end },
    }).lean();

    // Map: employeeId -> date -> status
    const attendanceMap = {};

    attendance.forEach((rec) => {
      const empId = rec.employee.toString();
      const date = rec.date; // YYYY-MM-DD

      if (!attendanceMap[empId]) {
        attendanceMap[empId] = {};
      }

      let status = "P";

      if (rec.startTime) {
        const t = new Date(rec.startTime);
        const isLate =
          t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
        status = isLate ? "L" : "P";
      }

      attendanceMap[empId][date] = status;
    });

    const rows = employees.map((emp) => ({
      employeeId: emp._id,
      name: `${emp.firstName} ${emp.lastName}`.trim(),
      designation: emp.professional?.designation || "--",
      type: emp.professional?.employeeType || "Office",
      days: attendanceMap[emp._id.toString()] || {},
    }));

    return res.json({
      success: true,
      month,
      employees: rows,
    });
  } catch (err) {
    console.error("❌ Monthly admin attendance error:", err);
    return res.status(500).json({ success: false });
  }
}
