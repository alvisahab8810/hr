import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Attendance from "@/models/employees/Attendance";
import LeaveApplication from "@/models/employees/LeaveApplication";
import Task from "@/models/tasks/Task";
import Brand from "@/models/tasks/Brand";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { generateSalaryForMonth } from "@/utils/payroll/generateSalaryForMonth";

// Matches the contentType -> Brand.monthlyDeliverables key mapping used by
// pages/api/admin/tasks/nomenclature.js, so target/done/pending here agree
// with how nomenclature (and therefore task month-tagging) is generated.
const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const DELIV_TYPES = [
  { type: "reel",     key: "reels",     label: "Reels"     },
  { type: "story",    key: "stories",   label: "Stories"   },
  { type: "carousel", key: "carousels", label: "Carousels" },
  { type: "post",     key: "posts",     label: "Posts"     },
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();

  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const monthIndex = now.getMonth();       // 0-indexed — matches SalaryReport.month schema
    const year = now.getFullYear();

    const todayStart = new Date(today + "T00:00:00.000Z");
    const todayEnd   = new Date(today + "T23:59:59.999Z");

    const [
      allEmployees,
      todayAttendance,
      todayLeaves,
      monthlySalaries,
      smBrands,
    ] = await Promise.all([
      Employee.find({ isActive: true }).select("firstName lastName professional").lean(),

      Attendance.find({ date: today })
        .populate("employee", "firstName lastName professional")
        .lean(),

      LeaveApplication.find({
        startDate: { $lte: todayEnd },
        endDate:   { $gte: todayStart },
        status:    { $in: ["Approved", "Pending"] },
      })
        .populate("employee", "firstName lastName")
        .sort({ createdAt: -1 })
        .lean(),

      generateSalaryForMonth(monthIndex, year),

      Brand.find({ isActive: true, services: "socialMedia" })
        .select("name color monthlyDeliverables")
        .lean(),
    ]);

    // --- Attendance processing ---
    const presentIds = new Set(
      todayAttendance.map(a => String(a.employee?._id || a.employee))
    );
    const lateRecords = todayAttendance.filter(rec => rec.isLate);
    const absentList  = allEmployees.filter(e => !presentIds.has(String(e._id)));

    const lateEmployees = lateRecords.map(rec => ({
      name:    rec.employee ? `${rec.employee.firstName} ${rec.employee.lastName}` : "Unknown",
      dept:    rec.employee?.professional?.department || "",
      checkIn: rec.startTime,
    }));

    const absentEmployees = absentList.map(e => ({
      name: `${e.firstName} ${e.lastName}`,
      dept: e.professional?.department || "",
    }));

    // --- Salary totals ---
    const salaryTotal      = monthlySalaries.reduce((sum, s) => sum + (s.netPay           || 0), 0);
    const salaryBasic      = monthlySalaries.reduce((sum, s) => sum + (s.basicSalary      || 0), 0);
    const salaryDeductions = monthlySalaries.reduce((sum, s) => sum + (s.deductions?.total || 0), 0);
    const salaryOvertime   = monthlySalaries.reduce((sum, s) => sum + (s.overtime?.amount  || 0), 0);
    const salaryReimb      = monthlySalaries.reduce((sum, s) => sum + (s.reimbursement?.approved || 0), 0);
    const processedCount   = monthlySalaries.filter(s => s.status === "Processed").length;

    // --- Brand monthly deliverables (target vs done vs pending, current month) ---
    const monthStr  = `${MONTH_SHORT[monthIndex]}'${String(year).slice(-2)}`;
    const brandIds  = smBrands.map(b => b._id);

    const taskCounts = brandIds.length ? await Task.aggregate([
      {
        $match: {
          brandId:     { $in: brandIds },
          contentType: { $in: DELIV_TYPES.map(d => d.type) },
          nomenclature: { $regex: `${monthStr}$` },
        },
      },
      {
        $group: {
          _id:   { brandId: "$brandId", contentType: "$contentType" },
          total: { $sum: 1 },
          done:  { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
    ]) : [];

    const countMap = {};
    taskCounts.forEach(c => {
      countMap[`${c._id.brandId}_${c._id.contentType}`] = { total: c.total, done: c.done };
    });

    const brandDeliverables = smBrands.map(b => {
      const deliverables = DELIV_TYPES.map(d => {
        const target  = b.monthlyDeliverables?.[d.key] || 0;
        const done    = countMap[`${b._id}_${d.type}`]?.done || 0;
        const pending = Math.max(target - done, 0);
        return { type: d.type, label: d.label, target, done, pending };
      });
      return {
        id:    String(b._id),
        name:  b.name,
        color: b.color || "#6366F1",
        deliverables,
        totalTarget:  deliverables.reduce((a, x) => a + x.target,  0),
        totalDone:    deliverables.reduce((a, x) => a + x.done,    0),
        totalPending: deliverables.reduce((a, x) => a + x.pending, 0),
      };
    });

    return res.json({
      success: true,
      data: {
        totalEmployees: allEmployees.length,
        today: {
          present:        todayAttendance.length,
          absent:         allEmployees.length - todayAttendance.length,
          late:           lateRecords.length,
          presentPercent: allEmployees.length
            ? Math.round((todayAttendance.length / allEmployees.length) * 100)
            : 0,
          lateEmployees,
          absentEmployees,
        },
        todayLeaves: todayLeaves.map(l => ({
          name:      l.employee ? `${l.employee.firstName} ${l.employee.lastName}` : "Unknown",
          type:      l.leaveType,
          status:    l.status,
          totalDays: l.totalDays,
          startDate: l.startDate,
          endDate:   l.endDate,
        })),
        monthlySalary: {
          total:          salaryTotal,
          basic:          salaryBasic,
          deductions:     salaryDeductions,
          overtime:       salaryOvertime,
          reimbursement:  salaryReimb,
          count:          monthlySalaries.length,
          processedCount,
          month:          monthIndex,
          year,
        },
        brandDeliverables,
      },
    });
  } catch (err) {
    console.error("Admin dashboard summary error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
