import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ Unified auth (same as reimbursement)
    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const overtimeRequests = await Overtime.find({
      employee: employee._id,
    })
      .sort({ createdAt: -1 })
      .populate("approvedBy", "name");

    return res.json({
      success: true,
      overtimeRequests,
    });
  } catch (err) {
    console.error("List overtime error:", err);
    return res.status(500).json({ success: false });
  }
}
