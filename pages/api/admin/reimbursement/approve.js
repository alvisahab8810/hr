// import dbConnect from "@/utils/dbConnect";
// import Reimbursement from "@/models/employees/Reimbursement";
// import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();
//   const admin = await getAdminFromReq(req, res);
//   if (!admin) return res.status(401).json({ success: false });

//   const { id } = req.body;

//   await Reimbursement.findByIdAndUpdate(id, {
//     status: "Approved",
//     approvedBy: admin._id,
//     approvedAt: new Date(),
//   });

//   res.json({ success: true });
// }



import {
  sendReimbursementApprovedEmail,
} from "@/utils/email/sendReimbursementEmail";

import dbConnect from "@/utils/dbConnect";
import Reimbursement from "@/models/employees/Reimbursement";
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

    let employee = null;
    if (!subAdmin && !isMainAdmin) {
      const { employee: emp, error } = await getEmployeeFromToken(req);
      if (error || !emp || emp.role !== "admin") {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
      employee = emp;
    }

    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, message: "Missing ID" });
    }

   const reimbursement = await Reimbursement
  .findById(id)
  .populate("employee");

if (!reimbursement) {
  return res.status(404).json({ success: false });
}

reimbursement.status = "Approved";
reimbursement.approvedAt = new Date();
reimbursement.approvedBy = employee?._id || null;

await reimbursement.save();

// Log admin activity for sub-admin/manager
if (subAdmin) {
  const empName = reimbursement.employee?.personal
    ? `${reimbursement.employee.personal.firstName} ${reimbursement.employee.personal.lastName}`.trim()
    : "Employee";
  logAdminActivity({
    adminUserId:   subAdmin.id,
    adminUserName: subAdmin.name || "Manager",
    adminUserRole: subAdmin.role || "",
    action:        "reimbursement_approved",
    category:      "reimbursement",
    description:   `Approved ₹${reimbursement.amount} reimbursement (${reimbursement.category}) for ${empName}`,
    metadata:      { employeeName: empName, employeeId: reimbursement.employee?._id },
  }).catch(() => {});
}

sendReimbursementApprovedEmail({
  employeeEmail: reimbursement.employee.email,
  employeeName: `${reimbursement.employee.personal.firstName} ${reimbursement.employee.personal.lastName}`,
  category: reimbursement.category,
  amount: reimbursement.amount,
});



    return res.json({ success: true });
  } catch (err) {
    console.error("Admin approve reimbursement error:", err);
    return res.status(500).json({ success: false });
  }
}
