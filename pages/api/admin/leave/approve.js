// import dbConnect from "@/utils/dbConnect";
// import LeaveApplication from "@/models/employees/LeaveApplication";
// import LeaveBalance from "@/models/employees/LeaveBalance";
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
//         message: "Only pending leaves can be approved",
//       });
//     }

//     const year = new Date(leave.startDate).getFullYear();

//     const balance = await LeaveBalance.findOne({
//       employee: leave.employee,
//       year,
//     });

//     if (!balance) {
//       return res.status(400).json({
//         message: "Leave balance not found",
//       });
//     }

//     // 🔹 DEDUCT BALANCE
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

//     await balance.save();

//     // 🔹 UPDATE LEAVE
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



import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import LeaveBalance from "@/models/employees/LeaveBalance";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const admin = await getAdminFromReq(req, res);
    if (!admin) {
      return res.status(401).json({ success: false });
    }

    const { leaveId, remark = "" } = req.body;

    if (!leaveId) {
      return res.status(400).json({ message: "Leave ID required" });
    }

    const leave = await LeaveApplication.findById(leaveId);
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

    // ✅ FIX: auto-create balance if missing
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
  // you said casual = earned policy
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
    leave.approvedBy = admin._id;

    await leave.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("Approve leave error:", err);
    return res.status(500).json({ success: false });
  }
}
