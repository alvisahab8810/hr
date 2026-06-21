// import dbConnect from "@/utils/dbConnect";
// import LeaveApplication from "@/models/employees/LeaveApplication";
// import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   try {
//     await dbConnect();

//     const admin = await getAdminFromReq(req, res);
//     if (!admin) {
//       return res.status(401).json({ success: false });
//     }

//     const { leaveId, remark = "" } = req.body;

//     if (!leaveId) {
//       return res.status(400).json({ message: "Leave ID required" });
//     }

//     const leave = await LeaveApplication.findById(leaveId);
//     if (!leave) {
//       return res.status(404).json({ message: "Leave not found" });
//     }

//     if (leave.status !== "Pending") {
//       return res.status(400).json({
//         message: "Only pending leaves can be rejected",
//       });
//     }

//     leave.status = "Rejected";
//     leave.adminRemark = remark;
//     leave.rejectedAt = new Date();
//     leave.rejectedBy = admin._id;

//     await leave.save();

//     return res.json({ success: true });
//   } catch (err) {
//     console.error("Reject leave error:", err);
//     return res.status(500).json({ success: false });
//   }
// }


import { sendLeaveRejectedEmail } from "@/utils/email/sendLeaveStatusEmail";
import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import { getEmployeeFromToken } from "@/utils/auth";
import { getAdminUserPayload } from "@/utils/admin/adminAuthGuard";
import { logAdminActivity } from "@/utils/tasks/logAdminActivity";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const subAdmin = getAdminUserPayload(req);
    const cookie = req.headers.cookie || "";
    const isMainAdmin = cookie.includes("admin_auth=true");

    let employee = null;
    if (!subAdmin && !isMainAdmin) {
      const { employee: emp, error } = await getEmployeeFromToken(req);
      if (error || !emp || emp.role !== "admin") {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      employee = emp;
    }

    const { leaveId, remark = "" } = req.body;

    if (!leaveId) {
      return res.status(400).json({ message: "Leave ID required" });
    }

    // const leave = await LeaveApplication.findById(leaveId);

    const leave = await LeaveApplication
  .findById(leaveId)
  .populate("employee");

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending leaves can be rejected",
      });
    }

    leave.status = "Rejected";
    leave.adminRemark = remark;
    leave.rejectedAt = new Date();
    leave.rejectedBy = employee?._id || null;

    await leave.save();

    // Log admin activity for sub-admin/manager
    if (subAdmin) {
      const empName = leave.employee?.firstName
        ? `${leave.employee.firstName} ${leave.employee.lastName || ""}`.trim()
        : "Employee";
      logAdminActivity({
        adminUserId:   subAdmin.id,
        adminUserName: subAdmin.name || "Manager",
        adminUserRole: subAdmin.role || "",
        action:        "leave_rejected",
        category:      "leave",
        description:   `Rejected ${leave.leaveType} for ${empName} (${leave.totalDays} day${leave.totalDays !== 1 ? "s" : ""})`,
        metadata:      { employeeId: leave.employee?._id, employeeName: empName },
      }).catch(() => {});
    }

    // 🔔 Send email (NON-BLOCKING)
sendLeaveRejectedEmail({
  to: leave.employee.email,
  name: leave.employee.firstName
    ? `${leave.employee.firstName} ${leave.employee.lastName || ""}`
    : "Employee",
  leaveType: leave.leaveType,
  startDate: leave.startDate,
  endDate: leave.endDate,
  remark,
}).catch((err) => {
  console.error("Leave rejection email failed:", err);
});


    return res.json({ success: true });
  } catch (err) {
    console.error("Reject leave error:", err);
    return res.status(500).json({ success: false });
  }
}
