

// import dbConnect from "@/utils/dbConnect";
// import LeaveApplication from "@/models/employees/LeaveApplication";
// import LeaveBalance from "@/models/employees/LeaveBalance";
// import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   try {
//     await dbConnect();

//     /* ================= AUTH ================= */
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
//         message: "Only pending leaves can be approved",
//       });
//     }

//     /* ================= BALANCE ================= */

//     const year = new Date(leave.startDate).getFullYear();

//     let balance = await LeaveBalance.findOne({
//       employee: leave.employee,
//       year,
//     });

//     // ✅ FIX: auto-create balance if missing
//     if (!balance) {
//       balance = await LeaveBalance.create({
//         employee: leave.employee,
//         year,
//       });
//     }

//     /* ================= DEDUCT BALANCE ================= */

//     if (leave.leaveType === "Sick Leave") {
//       if (balance.sick.used + leave.totalDays > balance.sick.total) {
//         return res.status(400).json({
//           message: "Insufficient sick leave balance",
//         });
//       }
//       balance.sick.used += leave.totalDays;
//     }

//     if (leave.leaveType === "Earned Leave") {
//       if (balance.earned.used + leave.totalDays > balance.earned.total) {
//         return res.status(400).json({
//           message: "Insufficient earned leave balance",
//         });
//       }
//       balance.earned.used += leave.totalDays;
//     }


//     if (leave.leaveType === "Casual Leave") {
//   // you said casual = earned policy
//   if (balance.earned.used + leave.totalDays > balance.earned.total) {
//     return res.status(400).json({
//       message: "Insufficient casual leave balance",
//     });
//   }
//   balance.earned.used += leave.totalDays;
// }


//     await balance.save();

//     /* ================= UPDATE LEAVE ================= */

//     leave.status = "Approved";
//     leave.adminRemark = remark;
//     leave.approvedAt = new Date();
//     leave.approvedBy = admin._id;

//     await leave.save();

//     return res.json({ success: true });
//   } catch (err) {
//     console.error("Approve leave error:", err);
//     return res.status(500).json({ success: false });
//   }
// }


import { sendLeaveApprovedEmail } from "@/utils/email/sendLeaveStatusEmail";
import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import LeaveBalance from "@/models/employees/LeaveBalance";
import { getEmployeeFromToken } from "@/utils/auth";
import { getAdminUserPayload } from "@/utils/admin/adminAuthGuard";
import { logAdminActivity } from "@/utils/tasks/logAdminActivity";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    /* ================= AUTH ================= */
    // Accept both employee-admin token and AdminUser (Manager/Sub-Admin) JWT
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
        message: "Only pending leaves can be approved",
      });
    }

    /* ================= BALANCE ================= */

    const year = new Date(leave.startDate).getFullYear();

    let balance = await LeaveBalance.findOne({
      employee: leave.employee,
      year,
    });

    // ✅ auto-create balance if missing
    if (!balance) {
      balance = await LeaveBalance.create({
        employee: leave.employee,
        year,
      });
    }

    /* ================= DEDUCT BALANCE ================= */

    if (leave.leaveType === "Sick Leave") {
      if (balance.sick.used + leave.totalDays > balance.sick.total) {
        return res.status(400).json({
          message: "Insufficient sick leave balance",
        });
      }
      balance.sick.used += leave.totalDays;
    }

    if (leave.leaveType === "Earned Leave") {
      if (balance.earned.used + leave.totalDays > balance.earned.total) {
        return res.status(400).json({
          message: "Insufficient earned leave balance",
        });
      }
      balance.earned.used += leave.totalDays;
    }

    if (leave.leaveType === "Casual Leave") {
      if (balance.earned.used + leave.totalDays > balance.earned.total) {
        return res.status(400).json({
          message: "Insufficient casual leave balance",
        });
      }
      balance.earned.used += leave.totalDays;
    }

    await balance.save();

    /* ================= UPDATE LEAVE ================= */

    leave.status = "Approved";
    leave.adminRemark = remark;
    leave.approvedAt = new Date();
    leave.approvedBy = employee?._id || null;

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
        action:        "leave_approved",
        category:      "leave",
        description:   `Approved ${leave.leaveType} for ${empName} (${leave.totalDays} day${leave.totalDays !== 1 ? "s" : ""})`,
        metadata:      { employeeId: leave.employee?._id, employeeName: empName },
      }).catch(() => {});
    }

    // 🔔 Send email (NON-BLOCKING)
sendLeaveApprovedEmail({
  to: leave.employee.email,
  name: leave.employee.firstName
    ? `${leave.employee.firstName} ${leave.employee.lastName || ""}`
    : "Employee",
  leaveType: leave.leaveType,
  startDate: leave.startDate,
  endDate: leave.endDate,
  totalDays: leave.totalDays,
  remark,
}).catch((err) => {
  console.error("Leave approval email failed:", err);
});


    return res.json({ success: true });
  } catch (err) {
    console.error("Approve leave error:", err);
    return res.status(500).json({ success: false });
  }
}
