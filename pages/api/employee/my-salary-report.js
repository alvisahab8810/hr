// pages/api/employee/my-salary-report.js
// GET → returns employee's SalaryReport + their waiver requests for a given month/year

import dbConnect from "@/utils/dbConnect";
import SalaryReport from "@/models/hr/SalaryReport";
import DeductionWaiverRequest from "@/models/employees/DeductionWaiverRequest";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  const month = Number(req.query.month ?? new Date().getMonth());
  const year  = Number(req.query.year  ?? new Date().getFullYear());

  const [report, waivers] = await Promise.all([
    SalaryReport.findOne({ employee: employee._id, month, year }).lean(),
    DeductionWaiverRequest.find({ employee: employee._id, month, year }).lean(),
  ]);

  return res.json({ success: true, report: report || null, waivers });
}
