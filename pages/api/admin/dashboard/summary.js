import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Attendance from "@/models/employees/Attendance";
import LeaveApplication from "@/models/employees/LeaveApplication";
import SalaryReport from "@/models/hr/SalaryReport";
import Task from "@/models/tasks/Task";
import Brand from "@/models/tasks/Brand";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

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
      taskByStatus,
      brandTaskRaw,
      todayTasksRaw,
      overdueCount,
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

      SalaryReport.find({ month: monthIndex, year }).select("netPay basicSalary deductions overtime reimbursement status").lean(),

      Task.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        {
          $group: {
            _id:        "$brandId",
            total:      { $sum: 1 },
            completed:  { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
            review:     { $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] } },
            blocked:    { $sum: { $cond: [{ $eq: ["$status", "blocked"] }, 1, 0] } },
          },
        },
        {
          $lookup: {
            from:         "brands",
            localField:   "_id",
            foreignField: "_id",
            as:           "brand",
          },
        },
        { $unwind: { path: "$brand", preserveNullAndEmptyArrays: false } },
        { $sort: { total: -1 } },
        { $limit: 10 },
      ]),

      Task.find({
        dueDate: { $gte: todayStart, $lte: todayEnd },
        status:  { $ne: "completed" },
      })
        .populate("assignedTo", "firstName lastName")
        .populate("brandId", "name color")
        .sort({ priority: 1, createdAt: -1 })
        .limit(15)
        .lean(),

      Task.countDocuments({
        dueDate: { $lt: now },
        status:  { $nin: ["completed"] },
      }),
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

    // --- Task stats ---
    const statusMap = {};
    taskByStatus.forEach(s => { statusMap[s._id] = s.count; });
    const totalTasks     = Object.values(statusMap).reduce((a, b) => a + b, 0);
    const completedTasks = statusMap["completed"] || 0;

    // --- Salary totals ---
    const salaryTotal      = monthlySalaries.reduce((sum, s) => sum + (s.netPay           || 0), 0);
    const salaryBasic      = monthlySalaries.reduce((sum, s) => sum + (s.basicSalary      || 0), 0);
    const salaryDeductions = monthlySalaries.reduce((sum, s) => sum + (s.deductions?.total || 0), 0);
    const salaryOvertime   = monthlySalaries.reduce((sum, s) => sum + (s.overtime?.amount  || 0), 0);
    const salaryReimb      = monthlySalaries.reduce((sum, s) => sum + (s.reimbursement?.approved || 0), 0);
    const processedCount   = monthlySalaries.filter(s => s.status === "Processed").length;

    // --- Brand tasks ---
    const brandTasks = brandTaskRaw.map(b => ({
      name:       b.brand.name,
      color:      b.brand.color || "#6366F1",
      total:      b.total,
      completed:  b.completed,
      inProgress: b.inProgress,
      review:     b.review,
      blocked:    b.blocked,
      todo:       b.total - b.completed - b.inProgress - b.review - b.blocked,
    }));

    // --- Today's assignments ---
    const PRIO_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
    const todayAssignments = todayTasksRaw
      .sort((a, b) => (PRIO_ORDER[a.priority] ?? 9) - (PRIO_ORDER[b.priority] ?? 9))
      .map(t => ({
        title:    t.title,
        priority: t.priority,
        status:   t.status,
        assignee: t.assignedTo
          ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}`
          : null,
        brand: t.brandId
          ? { name: t.brandId.name, color: t.brandId.color }
          : null,
        dueDate: t.dueDate,
      }));

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
        taskStats: {
          total:          totalTasks,
          overdue:        overdueCount,
          completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          byStatus: {
            todo:        statusMap["todo"]        || 0,
            in_progress: statusMap["in_progress"] || 0,
            review:      statusMap["review"]      || 0,
            completed:   statusMap["completed"]   || 0,
            blocked:     statusMap["blocked"]     || 0,
          },
        },
        brandTasks,
        todayAssignments,
      },
    });
  } catch (err) {
    console.error("Admin dashboard summary error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
