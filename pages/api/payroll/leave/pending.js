


// // pages/api/payroll/leave/pending.js
// import dbConnect from "@/utils/dbConnect";
// import LeaveRequest from "@/models/payroll/LeaveRequest";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   try {
//     await dbConnect();
//     const leaves = await LeaveRequest.find()
//       .populate("employeeId", "name email") // ✅ Fetch employee name
//       .sort({ createdAt: -1 });

//     return res.status(200).json({ success: true, data: leaves });
//   } catch (err) {
//     console.error("Pending Leaves Fetch Error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }



// pages/api/payroll/leave/pending.js
import dbConnect from "@/utils/dbConnect";
import LeaveRequest from "@/models/payroll/LeaveRequest";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    await dbConnect();

    // ✅ Populate firstName and lastName instead of name
    const leaves = await LeaveRequest.find()
      .populate("employeeId", "firstName lastName employeeId")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: leaves });
  } catch (err) {
    console.error("Leave fetch error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
