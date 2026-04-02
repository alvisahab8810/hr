// pages/api/admin/deduction-waiver/reject.js
import dbConnect from "@/utils/dbConnect";
import DeductionWaiverRequest from "@/models/employees/DeductionWaiverRequest";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const { employee: admin, error } = await getEmployeeFromToken(req);
  if (error || !admin || admin.role !== "admin") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { id, adminRemark } = req.body;
  if (!id) return res.status(400).json({ success: false, message: "Request ID is required" });

  const waiver = await DeductionWaiverRequest.findById(id);
  if (!waiver) return res.status(404).json({ success: false, message: "Request not found" });
  if (waiver.status !== "Pending") {
    return res.status(409).json({ success: false, message: `Request is already ${waiver.status}` });
  }

  waiver.status      = "Rejected";
  waiver.adminRemark = adminRemark?.trim() || "";
  waiver.rejectedBy  = admin._id;
  waiver.rejectedAt  = new Date();
  await waiver.save();

  return res.json({ success: true, data: waiver, message: "Waiver rejected. Deduction will remain as applied." });
}
