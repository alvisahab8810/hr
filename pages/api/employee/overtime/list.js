// pages/api/employee/overtime/list.js
import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const overtimeRequests = await Overtime.find({ employee: employee._id })
      .sort({ createdAt: -1 })
      .populate("approvedBy", "name");

    res.status(200).json({ success: true, overtimeRequests });
  } catch (err) {
    console.error("List overtime error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

// import dbConnect from "@/utils/dbConnect";
// import Overtime from "@/models/employees/Overtime";
// import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   try {
//     await dbConnect();

//     // ✅ Unified auth (same as reimbursement)
//     const employee = await getEmployeeFromReq(req, res);
//     if (!employee) return;

//     const overtimeRequests = await Overtime.find({
//       employee: employee._id,
//     })
//       .sort({ createdAt: -1 })
//       .populate("approvedBy", "name");

//     return res.json({
//       success: true,
//       overtimeRequests,
//     });
//   } catch (err) {
//     console.error("List overtime error:", err);
//     return res.status(500).json({ success: false });
//   }
// }
