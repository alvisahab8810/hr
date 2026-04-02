// pages/api/admin/deduction-waiver/report.js
// GET → all employees' salary reports + waiver requests for a given month/year

import dbConnect from "@/utils/dbConnect";
import SalaryReport from "@/models/hr/SalaryReport";
import DeductionWaiverRequest from "@/models/employees/DeductionWaiverRequest";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const { employee: admin, error } = await getEmployeeFromToken(req);
  if (error || !admin || admin.role !== "admin") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const month = Number(req.query.month ?? new Date().getMonth());
  const year  = Number(req.query.year  ?? new Date().getFullYear());

  const [reports, waivers] = await Promise.all([
    SalaryReport.find({ month, year })
      .populate("employee", "firstName lastName employeeId email professional")
      .lean(),
    DeductionWaiverRequest.find({ month, year })
      .populate("employee", "firstName lastName employeeId")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName")
      .lean(),
  ]);

  return res.json({ success: true, reports, waivers });
}
