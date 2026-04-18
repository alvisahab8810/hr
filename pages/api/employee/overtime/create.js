import {
  sendOvertimeAppliedEmployeeEmail,
  sendOvertimeAppliedAdminEmail,
} from "@/utils/email/sendOvertimeEmail";

import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ Unified auth
    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const {
      project,
      date,
      otType,
      startTime,
      endTime,
      reason,
      tasks,
       otApprover, // 👈 ADD THIS
    } = req.body;

    // 🔒 Validation
    if (
      !project ||
      !date ||
      !otType ||
      !startTime ||
      !endTime ||
      !reason ||
      !tasks ||
      !otApprover // 👈 ADD THIS
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const diffMins = (eh * 60 + em) - (sh * 60 + sm);
    const actualMins = diffMins === 0 ? 0 : diffMins > 0 ? diffMins : diffMins + 24 * 60;

    if (actualMins === 0) {
      return res.status(400).json({
        success: false,
        message: "Start and end time cannot be the same",
      });
    }
    if (actualMins > 16 * 60) {
      return res.status(400).json({
        success: false,
        message: "OT duration cannot exceed 16 hours",
      });
    }

    const overtime = await Overtime.create({
      employee: employee._id,
      project,
      date,
      otType,
      startTime,
      endTime,
      reason,
      tasks,
      otApprover, // 👈 ADD THIS
      status: "Pending",
    });

    // ================= SEND EMAILS (NON-BLOCKING) =================
const employeeName = employee.firstName
  ? `${employee.firstName} ${employee.lastName || ""}`
  : "Employee";

// Employee confirmation
sendOvertimeAppliedEmployeeEmail({
  to: employee.email,
  name: employeeName,
  project,
  date,
  otType,
  startTime,
  endTime,
  reason,
    otApprover, // ✅ ADD



}).catch((err) =>
  console.error("Employee OT email failed:", err)
);

// Admin / Management alert
sendOvertimeAppliedAdminEmail({
  employeeName,
  employeeEmail: employee.email,
  project,
  date,
  otType,
  startTime,
  endTime,
  reason,
  tasks,
  otApprover, // 👈 ADD THIS

}).catch((err) =>
  console.error("Admin OT email failed:", err)
);


    return res.status(201).json({
      success: true,
      overtime,
    });
  } catch (err) {
    console.error("Create overtime error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
}
