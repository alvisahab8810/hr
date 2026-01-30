
import {
  sendOvertimeRejectedEmail,
  sendOvertimeAppliedAdminEmail,
} from "@/utils/email/sendOvertimeEmail";

import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ Admin auth
    const { employee, error } = await getEmployeeFromToken(req);

    if (error || !employee || employee.role !== "admin") {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const { id, remark } = req.body;

    if (!id || !remark || remark.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "OT ID and rejection remark required",
      });
    }

    // const overtime = await Overtime.findById(id);
    const overtime = await Overtime.findById(id).populate({
  path: "employee",
  select: "email personal.firstName personal.lastName",
});

    if (!overtime) {
      return res
        .status(404)
        .json({ success: false, message: "Overtime request not found" });
    }

    // ✅ Update OT
    overtime.status = "Rejected";
    overtime.adminRemark = remark;
    overtime.approvedBy = employee._id;
    overtime.approvedAt = new Date();

    await overtime.save();

  
    // ================= SEND EMAILS (NON-BLOCKING) =================
sendOvertimeRejectedEmail({
  to: overtime.employee.email,
  name:
    overtime.employee.personal?.firstName +
    " " +
    (overtime.employee.personal?.lastName || ""),
  project: overtime.project,
  date: overtime.date,
  otType: overtime.otType,
  remark,
}).catch((err) =>
  console.error("OT rejected employee email failed:", err)
);

sendOvertimeAppliedAdminEmail({
  employeeName:
    overtime.employee.personal?.firstName +
    " " +
    (overtime.employee.personal?.lastName || ""),
  employeeEmail: overtime.employee.email,
  project: overtime.project,
  date: overtime.date,
  otType: overtime.otType,
  startTime: overtime.startTime,
  endTime: overtime.endTime,
  reason: overtime.reason,
  tasks: overtime.tasks,
}).catch((err) =>
  console.error("OT rejected admin email failed:", err)
);



    return res.json({
      success: true,
      overtime,
    });
  } catch (err) {
    console.error("Reject overtime error:", err);
    return res.status(500).json({ success: false });
  }
}
