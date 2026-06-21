// import dbConnect from "@/utils/dbConnect";
// import Overtime from "@/models/employees/Overtime";
// import { getEmployeeFromToken } from "@/utils/auth";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   try {
//     await dbConnect();

//     // ✅ Admin auth (same as reimbursement)
//     const { employee, error } = await getEmployeeFromToken(req);

//     if (error || !employee || employee.role !== "admin") {
//       return res
//         .status(401)
//         .json({ success: false, message: "Unauthorized" });
//     }

//     const { id } = req.body;

//     if (!id) {
//       return res
//         .status(400)
//         .json({ success: false, message: "OT ID required" });
//     }

//     const overtime = await Overtime.findById(id);
//     if (!overtime) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Overtime request not found" });
//     }

//     // ✅ Update OT
//     overtime.status = "Approved";
//     overtime.approvedBy = employee._id;
//     overtime.approvedAt = new Date();

//     await overtime.save();

//     return res.json({
//       success: true,
//       overtime,
//     });
//   } catch (err) {
//     console.error("Approve overtime error:", err);
//     return res.status(500).json({ success: false });
//   }
// }

import {
  sendOvertimeApprovedEmail,
  sendOvertimeAppliedAdminEmail,
} from "@/utils/email/sendOvertimeEmail";

import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import SalaryReport from "@/models/hr/SalaryReport";
import { getEmployeeFromToken } from "@/utils/auth";
import { getAdminUserPayload } from "@/utils/admin/adminAuthGuard";
import { logAdminActivity } from "@/utils/tasks/logAdminActivity";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    // Accept both employee-admin token and AdminUser JWT
    const subAdmin = getAdminUserPayload(req);
    const cookie = req.headers.cookie || "";
    const isMainAdmin = cookie.includes("admin_auth=true");

    let admin = null;
    if (!subAdmin && !isMainAdmin) {
      const { employee: emp, error } = await getEmployeeFromToken(req);
      if (error || !emp || emp.role !== "admin") {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      admin = emp;
    }

    const { id } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "OT ID required" });
    }

    // ✅ Fetch OT
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

    // ✅ Approve OT
    overtime.status = "Approved";
    overtime.approvedBy = admin?._id || null;
    overtime.approvedAt = new Date();
    await overtime.save();

    // Log admin activity for sub-admin/manager
    if (subAdmin) {
      const empName = `${overtime.employee.personal?.firstName || ""} ${overtime.employee.personal?.lastName || ""}`.trim() || "Employee";
      logAdminActivity({
        adminUserId:   subAdmin.id,
        adminUserName: subAdmin.name || "Manager",
        adminUserRole: subAdmin.role || "",
        action:        "overtime_approved",
        category:      "overtime",
        description:   `Approved overtime for ${empName} on ${overtime.date ? new Date(overtime.date).toLocaleDateString("en-IN") : ""}`,
        metadata:      { employeeName: empName },
      }).catch(() => {});
    }

    // ================= SEND EMAILS (NON-BLOCKING) =================
    sendOvertimeApprovedEmail({
      to: overtime.employee.email,
      name:
        overtime.employee.personal?.firstName +
        " " +
        (overtime.employee.personal?.lastName || ""),
      project: overtime.project,
      date: overtime.date,
      otType: overtime.otType,
      startTime: overtime.startTime,
      endTime: overtime.endTime,
    }).catch((err) => console.error("OT approved employee email failed:", err));

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
    }).catch((err) => console.error("OT approved admin email failed:", err));

    // ✅ OPTIONAL: mark salary as outdated (safe)
    await SalaryReport.updateMany(
      {
        employee: overtime.employee,
        month: overtime.date.getMonth(),
        year: overtime.date.getFullYear(),
      },
      { $set: { status: "Pending" } }, // reuse existing field
    );

    return res.json({
      success: true,
      overtime,
      message: "OT approved. Please regenerate salary to reflect changes.",
    });
  } catch (err) {
    console.error("Approve overtime error:", err);
    return res.status(500).json({ success: false });
  }
}
