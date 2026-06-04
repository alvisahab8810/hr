// pages/api/admin/deduction-waiver/report.js
// GET → all active employees' salary reports + waiver requests + attendance detail for a given month/year

import dbConnect from "@/utils/dbConnect";
import SalaryReport from "@/models/hr/SalaryReport";
import DeductionWaiverRequest from "@/models/employees/DeductionWaiverRequest";
import Attendance from "@/models/employees/Attendance";
import LeaveApplication from "@/models/employees/LeaveApplication";
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

  const monthStr = String(month + 1).padStart(2, "0");
  const dateFrom = `${year}-${monthStr}-01`;
  const dateTo   = `${year}-${monthStr}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}`;

  const [reports, waivers] = await Promise.all([
    SalaryReport.find({ month, year })
      .populate("employee", "firstName lastName personal employeeId email professional isActive")
      .lean(),
    DeductionWaiverRequest.find({ month, year })
      .populate("employee", "firstName lastName employeeId")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName")
      .lean(),
  ]);

  // Exclude former (deactivated) employees
  const activeReports = reports.filter(r => r.employee?.isActive !== false);

  // Fetch attendance + leave data for all active employees in this month
  const empIds = activeReports.map(r => r.employee?._id).filter(Boolean);
  const monthStart = new Date(year, month, 1);
  const monthEnd   = new Date(year, month + 1, 1);

  const [attendanceRecords, leaveApplications] = await Promise.all([
    Attendance.find({
      employee: { $in: empIds },
      date: { $gte: dateFrom, $lte: dateTo },
    }).select("employee date startTime endTime isLate lateMarked latePenaltyApplied latePenaltyAmount deductions breaks isHalfDay").lean(),
    LeaveApplication.find({
      employee: { $in: empIds },
      status: { $in: ["Pending", "Approved", "Rejected"] },
      startDate: { $lt: monthEnd },
      endDate:   { $gte: monthStart },
    }).select("employee leaveType startDate endDate status").lean(),
  ]);

  // Group attendance by employee ID
  const attByEmp = {};
  attendanceRecords.forEach(a => {
    const eid = a.employee.toString();
    if (!attByEmp[eid]) attByEmp[eid] = [];
    attByEmp[eid].push(a);
  });

  // Build a leave date map: { "empId_YYYY-MM-DD": { leaveType, status } }
  const leaveDateMap = {};
  leaveApplications.forEach(l => {
    const eid   = l.employee.toString();
    const start = new Date(Math.max(new Date(l.startDate), monthStart));
    const end   = new Date(Math.min(new Date(l.endDate), new Date(monthEnd - 1)));
    const cur   = new Date(start);
    while (cur <= end) {
      const dk = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`;
      leaveDateMap[`${eid}_${dk}`] = { leaveType: l.leaveType, status: l.status };
      cur.setDate(cur.getDate() + 1);
    }
  });

  // Attach attendance + leave data to each report
  const reportsWithDetail = activeReports.map(r => ({
    ...r,
    attendanceRecords: attByEmp[r.employee?._id?.toString()] || [],
    leaveDateMap: Object.fromEntries(
      Object.entries(leaveDateMap)
        .filter(([k]) => k.startsWith(r.employee?._id?.toString() + "_"))
        .map(([k, v]) => [k.slice(r.employee?._id?.toString().length + 1), v])
    ),
  }));

  return res.json({ success: true, reports: reportsWithDetail, waivers });
}
