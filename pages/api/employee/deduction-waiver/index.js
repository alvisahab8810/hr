// pages/api/employee/deduction-waiver/index.js
// GET  → list own waiver requests for a month/year
// POST → submit a waiver request for a specific deduction line

import dbConnect from "@/utils/dbConnect";
import DeductionWaiverRequest from "@/models/employees/DeductionWaiverRequest";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  await dbConnect();
  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  /* ── GET ── */
  if (req.method === "GET") {
    const { month, year } = req.query;
    const filter = { employee: employee._id };
    if (month !== undefined) filter.month = Number(month);
    if (year  !== undefined) filter.year  = Number(year);
    const requests = await DeductionWaiverRequest.find(filter).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: requests });
  }

  /* ── POST ── */
  if (req.method === "POST") {
    const { month, year, deductionType, amount, reason } = req.body;

    if (month === undefined || month === null)
      return res.status(400).json({ success: false, message: "Month is required" });
    if (!year)
      return res.status(400).json({ success: false, message: "Year is required" });
    if (!deductionType)
      return res.status(400).json({ success: false, message: "Deduction type is required" });
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: "Valid amount is required" });
    if (!reason?.trim())
      return res.status(400).json({ success: false, message: "Reason is required" });

    // One pending request per type per month
    const existing = await DeductionWaiverRequest.findOne({
      employee: employee._id,
      month: Number(month),
      year: Number(year),
      deductionType,
      status: "Pending",
    });
    if (existing)
      return res.status(409).json({ success: false, message: "You already have a pending request for this deduction this month." });

    const request = await DeductionWaiverRequest.create({
      employee:      employee._id,
      month:         Number(month),
      year:          Number(year),
      deductionType,
      amount:        Number(amount),
      reason:        reason.trim(),
    });

    return res.status(201).json({ success: true, data: request });
  }

  return res.status(405).end();
}
