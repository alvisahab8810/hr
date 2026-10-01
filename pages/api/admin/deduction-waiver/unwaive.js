// pages/api/admin/deduction-waiver/unwaive.js
// Admin takes a waiver back — one day at a time, or the whole line

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

  const { employeeId, month, year, deductionType, amount, waivedDates } = req.body;

  if (!employeeId) return res.status(400).json({ success: false, message: "employeeId required" });
  if (month === undefined || month === null) return res.status(400).json({ success: false, message: "month required" });
  if (!year) return res.status(400).json({ success: false, message: "year required" });
  if (!deductionType) return res.status(400).json({ success: false, message: "deductionType required" });

  const existing = await DeductionWaiverRequest.findOne({
    employee: employeeId,
    month: Number(month),
    year: Number(year),
    deductionType,
  });
  if (!existing) return res.status(404).json({ success: false, message: "No waiver found for this deduction" });

  const left = Math.max(0, Math.round(Number(amount || 0)));

  // Nothing left to waive, so the record goes rather than sitting at zero.
  if (left <= 0) {
    await existing.deleteOne();
    return res.json({ success: true, data: null, message: "Waiver removed" });
  }

  existing.amount      = left;
  existing.waivedDates = Array.isArray(waivedDates) ? waivedDates : existing.waivedDates;
  existing.adminRemark = "Waiver updated by admin";
  existing.approvedBy  = admin._id || null;
  existing.approvedAt  = new Date();
  await existing.save();

  return res.json({ success: true, data: existing, message: "Waiver updated" });
}
