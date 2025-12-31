import dbConnect from "@/utils/dbConnect";
import Reimbursement from "@/models/employees/Reimbursement";
import Employee from "@/models/hr/Employee"; // ✅ CORRECT PATH
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const admin = await getAdminFromReq(req, res);
    if (!admin) {
      return res.status(401).json({ success: false });
    }

    const data = await Reimbursement.find()
      .populate(
        "employee",
        "firstName lastName email personal professional"
      )
      .sort({ createdAt: -1 });

    return res.json({ success: true, data });
  } catch (err) {
    console.error("Admin reimbursement list error:", err);
    return res.status(500).json({ success: false });
  }
}
