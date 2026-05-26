import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const { leaveId } = req.body;
    if (!leaveId) return res.status(400).json({ success: false, message: "Leave ID required" });

    const leave = await LeaveApplication.findOne({
      _id: leaveId,
      employee: employee._id,
    });

    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });

    if (leave.status !== "Draft") {
      return res.status(400).json({ success: false, message: "Only draft leaves can be deleted" });
    }

    await leave.deleteOne();
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete leave error:", err);
    return res.status(500).json({ success: false });
  }
}
