// pages/api/admin/deduction-waiver/override.js
// Admin can directly waive a deduction without an employee request

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

  const { employeeId, month, year, deductionType, amount, adminRemark } = req.body;

  if (!employeeId) return res.status(400).json({ success: false, message: "employeeId required" });
  if (month === undefined || month === null) return res.status(400).json({ success: false, message: "month required" });
  if (!year) return res.status(400).json({ success: false, message: "year required" });
  if (!deductionType) return res.status(400).json({ success: false, message: "deductionType required" });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ success: false, message: "valid amount required" });

  // Upsert: if a waiver already exists for this type/month, update it to Approved
  // Otherwise create a new one pre-approved
  const existing = await DeductionWaiverRequest.findOne({
    employee: employeeId,
    month: Number(month),
    year: Number(year),
    deductionType,
  });

  let waiver;
  if (existing) {
    existing.status      = "Approved";
    existing.amount      = Number(amount);
    existing.adminRemark = adminRemark?.trim() || "Waived by admin";
    existing.approvedBy  = admin._id || null;
    existing.approvedAt  = new Date();
    existing.reason      = existing.reason || "Admin override";
    await existing.save();
    waiver = existing;
  } else {
    waiver = await DeductionWaiverRequest.create({
      employee:      employeeId,
      month:         Number(month),
      year:          Number(year),
      deductionType,
      amount:        Number(amount),
      reason:        "Admin override — waived directly by admin",
      status:        "Approved",
      adminRemark:   adminRemark?.trim() || "Waived by admin",
      approvedBy:    admin._id || null,
      approvedAt:    new Date(),
    });
  }

  return res.json({ success: true, data: waiver, message: "Deduction waived successfully" });
}
