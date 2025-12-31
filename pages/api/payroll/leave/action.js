import dbConnect from "@/utils/dbConnect";
import LeaveRequest from "@/models/payroll/LeaveRequest";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ success: false, message: "Method not allowed" });

  try {
    await dbConnect();
    const { leaveId, action } = req.body;

    if (!leaveId || !["Approved", "Rejected"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    const leave = await LeaveRequest.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ success: false, message: "Leave not found" });
    }

    leave.status = action;
    await leave.save();

    return res.status(200).json({ success: true, message: `Leave ${action}` });
  } catch (error) {
    console.error("Action error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
