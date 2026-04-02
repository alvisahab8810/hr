// pages/api/admin/deduction-waiver/index.js
// GET → list all waiver requests (admin only), filterable by status/month/year

import dbConnect from "@/utils/dbConnect";
import DeductionWaiverRequest from "@/models/employees/DeductionWaiverRequest";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const { employee: admin, error } = await getEmployeeFromToken(req);
  if (error || !admin || admin.role !== "admin") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { status, month, year } = req.query;

  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (month !== undefined && month !== "") filter.month = Number(month);
  if (year  !== undefined && year  !== "") filter.year  = Number(year);

  const requests = await DeductionWaiverRequest.find(filter)
    .populate("employee", "firstName lastName employeeId email personal professional")
    .populate("approvedBy", "firstName lastName")
    .populate("rejectedBy", "firstName lastName")
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ success: true, data: requests });
}
