// pages/api/admin/reimbursement/list.js
import dbConnect from "@/utils/dbConnect";
import Reimbursement from "@/models/employees/Reimbursement";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ Same auth as before — unchanged
    const { employee, error } = await getEmployeeFromToken(req);

    if (error || !employee || employee.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ NEW: optional month/year filter
    // If NOT provided → returns ALL records, same behaviour as before
    const { month, year } = req.query;

    const query = {};

    if (month !== undefined && year !== undefined) {
      const m          = Number(month); // 0-indexed (Jan=0)
      const y          = Number(year);
      const monthStart = new Date(y, m, 1);
      const monthEnd   = new Date(y, m + 1, 1);
      query.createdAt  = { $gte: monthStart, $lt: monthEnd };
    }

    // ✅ Same populate as before — unchanged
    const data = await Reimbursement.find(query)
      .populate(
        "employee",
        "personal professional"
      )
      .sort({ createdAt: -1 });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("Admin reimbursement list error:", err);
    return res.status(500).json({ success: false });
  }
}






// import dbConnect from "@/utils/dbConnect";
// import Reimbursement from "@/models/employees/Reimbursement";
// import { getEmployeeFromToken } from "@/utils/auth";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   try {
//     await dbConnect();

//     // ✅ Use SAME auth that works in production
//     const { employee, error } = await getEmployeeFromToken(req);

//     if (error || !employee || employee.role !== "admin") {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     // ✅ CORRECT populate field (matches schema)
//     const data = await Reimbursement.find()
//       .populate(
//         "employee",
//         "personal.firstName personal.lastName personal.email professional"
//       )
//       .sort({ createdAt: -1 });

//     return res.json({ success: true, data });
//   } catch (err) {
//     console.error("Admin reimbursement list error:", err);
//     return res.status(500).json({ success: false });
//   }
// }

