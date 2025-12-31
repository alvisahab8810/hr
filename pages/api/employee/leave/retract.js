import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const { leaveId, remark } = req.body;

    if (!leaveId) {
      return res.status(400).json({ message: "Leave ID required" });
    }

    if (!remark || !remark.trim()) {
      return res.status(400).json({
        message: "Retract reason is required",
      });
    }

    const leave = await LeaveApplication.findOne({
      _id: leaveId,
      employee: employee._id,
    });

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending leaves can be retracted",
      });
    }

    // ✅ UPDATE RETRACT INFO
    leave.status = "Retracted";
    leave.employeeRemark = remark;
    leave.retractedAt = new Date();

    await leave.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("Retract leave error:", err);
    return res.status(500).json({ success: false });
  }
}
