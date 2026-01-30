
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




import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import SalaryReport from "@/models/hr/SalaryReport";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ Admin auth
    const { employee: admin, error } = await getEmployeeFromToken(req);

    if (error || !admin || admin.role !== "admin") {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.body;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "OT ID required" });
    }

    // ✅ Fetch OT
    const overtime = await Overtime.findById(id);
    if (!overtime) {
      return res
        .status(404)
        .json({ success: false, message: "Overtime request not found" });
    }

    // ✅ Approve OT
    overtime.status = "Approved";
    overtime.approvedBy = admin._id;
    overtime.approvedAt = new Date();
    await overtime.save();

    // ✅ OPTIONAL: mark salary as outdated (safe)
    await SalaryReport.updateMany(
      {
        employee: overtime.employee,
        month: overtime.date.getMonth(),
        year: overtime.date.getFullYear(),
      },
      { $set: { status: "Pending" } } // reuse existing field
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
