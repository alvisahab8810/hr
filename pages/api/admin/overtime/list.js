// pages/api/admin/overtime/list.js
import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ Same auth — unchanged
    const { employee, error } = await getEmployeeFromToken(req);

    if (error || !employee || employee.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ NEW: optional month/year filter
    // If NOT provided → returns ALL records (same as before, no breaking change)
    const { month, year } = req.query;

    const query = {};

    if (month !== undefined && year !== undefined) {
      const m          = Number(month); // 0-indexed
      const y          = Number(year);
      const monthStart = new Date(y, m, 1);
      const monthEnd   = new Date(y, m + 1, 1);
      query.date       = { $gte: monthStart, $lt: monthEnd };
    }

    // ✅ Same populate — unchanged
    const overtimeRequests = await Overtime.find(query)
      .populate(
        "employee",
        "personal professional"
      )
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({ success: true, overtimeRequests });
  } catch (err) {
    console.error("Admin overtime list error:", err);
    return res.status(500).json({ success: false });
  }
}


// import dbConnect from "@/utils/dbConnect";
// import Overtime from "@/models/employees/Overtime";
// import { getEmployeeFromToken } from "@/utils/auth";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   try {
//     await dbConnect();

//     // ✅ SAME auth logic that already works
//     const { employee, error } = await getEmployeeFromToken(req);

//     if (error || !employee || employee.role !== "admin") {
//       return res
//         .status(401)
//         .json({ success: false, message: "Unauthorized" });
//     }

//     // ✅ SAME pattern as reimbursement
//     const overtimeRequests = await Overtime.find()
//       .populate(
//         "employee",
//         "personal.firstName personal.lastName personal.email professional"
//       )
//       .populate("approvedBy", "name email")
//       .sort({ createdAt: -1 });

//     return res.json({
//       success: true,
//       overtimeRequests,
//     });
//   } catch (err) {
//     console.error("Admin overtime list error:", err);
//     return res.status(500).json({ success: false });
//   }
// }
