// import dbConnect from "@/utils/dbConnect";
// import LeaveApplication from "@/models/employees/LeaveApplication";
// import Employee from "@/models/hr/Employee";
// import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   try {
//     await dbConnect();

//     const admin = await getAdminFromReq(req, res);
//     if (!admin) {
//       return res.status(401).json({ success: false });
//     }

//     const leaves = await LeaveApplication.find()
//       .populate({
//         path: "employee",
//         select: "firstName lastName personal",
//       })
//       .sort({ createdAt: -1 })
//       .lean();

//     return res.json({
//       success: true,
//       leaves,
//     });
//   } catch (err) {
//     console.error("Admin leave list error:", err);
//     return res.status(500).json({ success: false });
//   }
// }



import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ PRODUCTION-SAFE ADMIN AUTH
    const { employee, error } = await getEmployeeFromToken(req);

    if (error || !employee || employee.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Month filter — default to current month (1-indexed)
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year  = parseInt(req.query.year)  || new Date().getFullYear();

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth   = new Date(year, month, 0, 23, 59, 59);

    const leaves = await LeaveApplication.find({
      status:    { $nin: ["Draft"] },
      startDate: { $gte: startOfMonth, $lte: endOfMonth },
    })
      .populate({
        path: "employee",
        select: "firstName lastName personal",
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      leaves,
    });
  } catch (err) {
    console.error("Admin leave list error:", err);
    return res.status(500).json({ success: false });
  }
}
