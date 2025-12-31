




import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const leaves = await LeaveApplication.find({
      employee: employee._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      leaves,
    });
  } catch (err) {
    console.error("Leave history error:", err);
    return res.status(500).json({ success: false });
  }
}
