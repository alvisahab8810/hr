// POST /api/admin/overtime/create — admin creates OT on behalf of any employee (bypasses past-date block)
import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import Employee from "@/models/employees/Employee";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();

  try {
    const { employeeId, project, date, otType, startTime, endTime, reason, tasks, otApprover } = req.body;

    if (!employeeId || !project || !date || !otType || !startTime || !endTime || !reason || !tasks || !otApprover) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Find employee by professional employeeId (e.g. VN1007)
    const employee = await Employee.findOne({ "professional.employeeId": employeeId });
    if (!employee) {
      return res.status(404).json({ success: false, message: `Employee ${employeeId} not found` });
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    const actualMins = diffMins > 0 ? diffMins : diffMins + 24 * 60;

    if (actualMins === 0) return res.status(400).json({ success: false, message: "Start and end time cannot be the same" });
    if (actualMins > 16 * 60) return res.status(400).json({ success: false, message: "OT duration cannot exceed 16 hours" });

    const overtime = await Overtime.create({
      employee: employee._id,
      project,
      date: new Date(date),
      otType,
      startTime,
      endTime,
      reason,
      tasks,
      otApprover,
      status: "Pending",
    });

    return res.status(201).json({ success: true, overtime, employeeName: `${employee.personal?.firstName} ${employee.personal?.lastName}` });
  } catch (err) {
    console.error("Admin create OT error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
