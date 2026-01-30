import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ SAME auth logic that already works
    const { employee, error } = await getEmployeeFromToken(req);

    if (error || !employee || employee.role !== "admin") {
      return res
        .status(401)
        .json({ success: false, message: "Unauthorized" });
    }

    // ✅ SAME pattern as reimbursement
    const overtimeRequests = await Overtime.find()
      .populate(
        "employee",
        "personal.firstName personal.lastName personal.email professional"
      )
      .populate("approvedBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      overtimeRequests,
    });
  } catch (err) {
    console.error("Admin overtime list error:", err);
    return res.status(500).json({ success: false });
  }
}
