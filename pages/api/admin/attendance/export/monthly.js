import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";
import * as XLSX from "xlsx";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).end();
  }

  try {
    await dbConnect();

    // 🔐 Admin auth
    const admin = await getAdminFromReq(req, res);
    if (!admin) {
      return res.status(401).end();
    }

    // 📅 Month (YYYY-MM)
    const { month } = req.query;
    if (!month) {
      return res.status(400).json({ message: "Month is required (YYYY-MM)" });
    }

    const year = Number(month.slice(0, 4));
    const monthIndex = Number(month.slice(5, 7)) - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    // 👥 Active employees only
    const employees = await Employee.find({ isActive: true }).lean();

    // 📊 Attendance records for the month
    const attendance = await Attendance.find({
      employee: { $in: employees.map((e) => e._id) },
      date: { $regex: `^${month}` }, // YYYY-MM-DD
    }).lean();

    // 🧠 Build attendance map: employeeId -> date -> record
    const attendanceMap = {};
    attendance.forEach((rec) => {
      const empId = rec.employee.toString();
      if (!attendanceMap[empId]) {
        attendanceMap[empId] = {};
      }
      attendanceMap[empId][rec.date] = rec;
    });

    // 🧾 Excel headers (EXPLICIT ORDER)
    const headers = [
      "Employee",
      "Designation",
      "Type",
      ...Array.from({ length: daysInMonth }, (_, i) =>
        String(i + 1).padStart(2, "0")
      ),
    ];

    // 🧾 Excel rows
    const rows = employees.map((emp) => {
      const row = [
        `${emp.firstName} ${emp.lastName}`,
        emp.professional?.designation || "",
        emp.professional?.employeeType || "",
      ];

      for (let d = 1; d <= daysInMonth; d++) {
        const dd = String(d).padStart(2, "0");
        const dateKey = `${month}-${dd}`;

        const rec = attendanceMap[emp._id]?.[dateKey];

        let status = "A"; // Absent by default
        if (rec?.startTime) {
          const t = new Date(rec.startTime);
          const isLate =
            t.getHours() > 10 ||
            (t.getHours() === 10 && t.getMinutes() > 10);
          status = isLate ? "L" : "P";
        }

        row.push(status);
      }

      return row;
    });

    // 📘 Create workbook
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // 🏷 File name
    const monthLabel = new Date(`${month}-01`).toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance-${monthLabel}.xlsx`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    return res.send(buffer);
  } catch (err) {
    console.error("❌ Monthly XLSX export error:", err);
    return res.status(500).json({ message: "Export failed" });
  }
}
