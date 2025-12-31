import dbConnect from "@/utils/dbConnect";
import SalaryReport from "@/models/hr/SalaryReport";
import Employee from "@/models/hr/Employee"; // ✅ MUST BE SAME
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();

  const admin = await getAdminFromReq(req, res);
  if (!admin) return res.status(401).json({ success: false });

  const { month, year } = req.query;

  const data = await SalaryReport.find({
    month: Number(month),
    year: Number(year),
  })
    .populate(
      "employee",
      "firstName lastName professional salary"
    )
    .sort({ createdAt: -1 });

  return res.json({ success: true, data });
}
