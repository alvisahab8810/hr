import dbConnect from "@/utils/dbConnect";
import Reimbursement from "@/models/employees/Reimbursement";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();
  const admin = await getAdminFromReq(req, res);
  if (!admin) return res.status(401).json({ success: false });

  


 const { id, remark } = req.body;

await Reimbursement.findByIdAndUpdate(id, {
  status: "Rejected",
  adminRemark: remark,
});

  res.json({ success: true });
}
