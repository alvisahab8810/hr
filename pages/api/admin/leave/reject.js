import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    const admin = await getAdminFromReq(req, res);
    if (!admin) {
      return res.status(401).json({ success: false });
    }

    const { leaveId, remark = "" } = req.body;

    if (!leaveId) {
      return res.status(400).json({ message: "Leave ID required" });
    }

    const leave = await LeaveApplication.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    if (leave.status !== "Pending") {
      return res.status(400).json({
        message: "Only pending leaves can be rejected",
      });
    }

    leave.status = "Rejected";
    leave.adminRemark = remark;
    leave.rejectedAt = new Date();
    leave.rejectedBy = admin._id;

    await leave.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("Reject leave error:", err);
    return res.status(500).json({ success: false });
  }
}
