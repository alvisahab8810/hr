import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import Employee from "@/models/hr/Employee";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const admin = await getAdminFromReq(req, res);
    if (!admin) {
      return res.status(401).json({ success: false });
    }

    const leaves = await LeaveApplication.find()
      .populate({
        path: "employee",
        select: "firstName lastName",
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      leaves,
    });
  } catch (err) {
    console.error("Admin leave list error:", err);
    return res.status(500).json({ success: false });
  }
}
