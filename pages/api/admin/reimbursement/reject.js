// import dbConnect from "@/utils/dbConnect";
// import Reimbursement from "@/models/employees/Reimbursement";
// import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();
//   const admin = await getAdminFromReq(req, res);
//   if (!admin) return res.status(401).json({ success: false });

  


//  const { id, remark } = req.body;

// await Reimbursement.findByIdAndUpdate(id, {
//   status: "Rejected",
//   adminRemark: remark,
// });

//   res.json({ success: true });
// }




import {
  sendReimbursementRejectedEmail,
} from "@/utils/email/sendReimbursementEmail";

import dbConnect from "@/utils/dbConnect";
import Reimbursement from "@/models/employees/Reimbursement";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ SAME auth pattern as reimbursement list
    const { employee, error } = await getEmployeeFromToken(req);

    if (error || !employee || employee.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id, remark } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Missing ID" });
    }

 const reimbursement = await Reimbursement
  .findById(id)
  .populate("employee");

if (!reimbursement) {
  return res.status(404).json({ success: false });
}

reimbursement.status = "Rejected";
reimbursement.adminRemark = remark || "";
await reimbursement.save();



sendReimbursementRejectedEmail({
  employeeEmail: reimbursement.employee.email,
  employeeName: `${reimbursement.employee.personal.firstName} ${reimbursement.employee.personal.lastName}`,
  category: reimbursement.category,
  amount: reimbursement.amount,
  remark,
});



    return res.json({ success: true });
  } catch (err) {
    console.error("Admin reject reimbursement error:", err);
    return res.status(500).json({ success: false });
  }
}
