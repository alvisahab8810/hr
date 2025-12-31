import dbConnect from "@/utils/dbConnect";
import SalaryReport from "@/models/hr/SalaryReport";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();
  const admin = await getAdminFromReq(req, res);
  if (!admin) return res.status(401).json({ success: false });

  const { id } = req.body;

  await SalaryReport.findByIdAndUpdate(id, {
    status: "Processed",
    processedAt: new Date(),
  });

  res.json({ success: true });
}
