import dbConnect from "@/utils/dbConnect";
import LeaveRequest from "@/models/payroll/LeaveRequest";

export default async function handler(req, res) {
  try {
    await dbConnect();
    const { employeeId } = req.query;

    if (!employeeId)
      return res.status(400).json({ success: false, message: "Missing employeeId" });

    const leaves = await LeaveRequest.find({ employeeId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: leaves });
  } catch (err) {
    console.error("Leave fetch error", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
