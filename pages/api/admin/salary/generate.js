

// pages/api/admin/salary/generate.js
//
// SALARY CALCULATION LOGIC:
//
//  If generated mid-month (e.g. March 16):
//    → Only count working days from March 1 to March 16
//    → Salary = basicSalary × (elapsedWorkingDays / totalWorkingDaysInMonth)
//    → Deductions based only on elapsed days
//
//  If generated at/after month end:
//    → Full month calculation (basicSalary × 1.0)
//
//  Working day = Mon–Sat, excluding Sundays, public holidays
//  3rd Saturday = half day
//  Per-day rate always = basicSalary / totalWorkingDaysInMonth (for fair deductions)
//
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Attendance from "@/models/employees/Attendance";
import LeaveApplication from "@/models/employees/LeaveApplication";
import Reimbursement from "@/models/employees/Reimbursement";
import SalaryReport from "@/models/hr/SalaryReport";
import Overtime from "@/models/employees/Overtime";
import Holiday from "@/models/Holiday";
import { getEmployeeFromToken } from "@/utils/auth";

// ── Policy ─────────────────────────────────────────────────────────────────────
const WORKING_HOURS_PER_DAY = 8;
const OT_MULTIPLIER         = 1.5;
const LATE_HOUR             = 10;
const LATE_MIN              = 10;

function calcLatePenalty(lateCount) {
  if (lateCount <= 2) return 0;
  if (lateCount === 3) return 500;
  if (lateCount <= 5) return 1500;
  if (lateCount <= 9) return 3500;
  return 5000;
}

function isSundayStr(dk) {
  return new Date(dk + "T00:00:00").getDay() === 0;
}

function isThirdSaturdayStr(dk) {
  const d = new Date(dk + "T00:00:00");
  if (d.getDay() !== 6) return false;
  let satCount = 0;
  for (let i = 1; i <= d.getDate(); i++) {
    if (new Date(d.getFullYear(), d.getMonth(), i).getDay() === 6) satCount++;
  }
  return satCount === 3;
}

function buildMonthDates(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr    = String(month + 1).padStart(2, "0");
  const dates       = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${monthStr}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}

function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function toDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Count total working days in full month (excluding Sundays + public holidays)
// 3rd Saturday counts as 0.5
function countWorkingDays(allDates, holidayDates) {
  let count = 0;
  for (const dk of allDates) {
    if (isSundayStr(dk))        continue;  // Sunday off
    if (holidayDates.has(dk))   continue;  // public holiday off
    if (isThirdSaturdayStr(dk)) { count += 0.5; continue; } // 3rd Sat = half day
    count++;
  }
  return count || 1; // avoid division by zero
}

// Count elapsed working days up to and including today (or month end)
function countElapsedWorkingDays(allDates, holidayDates, todayStr) {
  let count = 0;
  for (const dk of allDates) {
    if (dk > todayStr)          break;     // stop at today
    if (isSundayStr(dk))        continue;
    if (holidayDates.has(dk))   continue;  // holiday = paid, counts toward elapsed
    if (isThirdSaturdayStr(dk)) { count += 0.5; continue; }
    count++;
  }
  return count || 1;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    const { employee: admin, error } = await getEmployeeFromToken(req);
    if (error || !admin || admin.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { month, year } = req.body; // month 0-indexed

    const monthStr   = String(month + 1).padStart(2, "0");
    const dateFrom   = `${year}-${monthStr}-01`;
    const dateTo     = `${year}-${monthStr}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, "0")}`;
    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 1);
    const allDates   = buildMonthDates(year, month);
    const todayStr   = getTodayStr();

    // Is today within this payroll month?
    const isCurrentMonth =
      todayStr >= dateFrom && todayStr <= dateTo;

    // The cutoff date for calculations:
    // - current month → use today
    // - past month    → use last day of month (full month)
    const cutoffStr = isCurrentMonth ? todayStr : dateTo;

    // ── Fetch public holidays for this month ───────────────────────────────
    const holidays = await Holiday.find({
      isActive: true,
      type: "public",
      startDate: { $lt: monthEnd },
      endDate:   { $gte: monthStart },
    }).lean();

    const holidayDates = new Set();
    holidays.forEach((h) => {
      const start = new Date(Math.max(new Date(h.startDate), monthStart));
      const end   = new Date(Math.min(new Date(h.endDate), new Date(monthEnd - 1)));
      const cur   = new Date(start);
      while (cur <= end) {
        holidayDates.add(toDateStr(cur));
        cur.setDate(cur.getDate() + 1);
      }
    });

    // ── Working day counts ─────────────────────────────────────────────────
    // Total working days in the full month (for per-day rate)
    const totalWorkingDays = countWorkingDays(allDates, holidayDates);

    // Elapsed working days up to today (for pro-rated earned salary)
    const elapsedWorkingDays = countElapsedWorkingDays(allDates, holidayDates, cutoffStr);

    const employees = await Employee.find({ isActive: true }).lean();
    const results   = [];

    for (const emp of employees) {
      const basicSalary = emp.salary?.monthlySalary;
      if (!basicSalary) continue;

      const empId = emp._id;

      // Per-day rate always based on FULL month working days (fair deduction rate)
      const perDaySalary = basicSalary / totalWorkingDays;

      // Earned salary = pro-rated if mid-month, full if month end
      // This is what gets shown — absent/late deductions come off this
      const earnedSalary = isCurrentMonth
        ? Number((basicSalary * (elapsedWorkingDays / totalWorkingDays)).toFixed(2))
        : basicSalary;

      // ── Attendance records ───────────────────────────────────────────────
      const attRecords = await Attendance.find({
        employee: empId,
        date: { $gte: dateFrom, $lte: cutoffStr },
      }).lean();

      const attMap = {};
      attRecords.forEach((r) => { attMap[r.date] = r; });

      // ── Approved leaves ──────────────────────────────────────────────────
      const approvedLeaves = await LeaveApplication.find({
        employee: empId,
        status: "Approved",
        startDate: { $lt: monthEnd },
        endDate:   { $gte: monthStart },
      }).lean();

      const paidLeaveDates   = new Set();
      const unpaidLeaveDates = new Set();

      approvedLeaves.forEach((leave) => {
        const start = new Date(Math.max(new Date(leave.startDate), monthStart));
        const end   = new Date(Math.min(new Date(leave.endDate), new Date(monthEnd - 1)));
        const cur   = new Date(start);
        while (cur <= end) {
          const dk = toDateStr(cur);
          const isPaid =
            leave.leaveType === "Sick Leave"   ||
            leave.leaveType === "Earned Leave" ||
            leave.leaveType === "Annual Leave" ||
            (leave.leaveType === "Casual Leave" && !leave.policyFlags?.sandwichLeave);
          if (isPaid) paidLeaveDates.add(dk);
          else        unpaidLeaveDates.add(dk);
          cur.setDate(cur.getDate() + 1);
        }
      });

      // ── Walk elapsed days only ───────────────────────────────────────────
      let presentDays  = 0;
      let absentDays   = 0;
      let lateCount    = 0;
      let halfDayCount = 0;
      let lunchPenalty = 0;

      for (const dk of allDates) {
        // Only process days up to cutoff
        if (dk > cutoffStr) break;

        // Sunday = week off
        if (isSundayStr(dk)) continue;

        // Public holiday = paid present
        if (holidayDates.has(dk)) {
          presentDays++;
          continue;
        }

        // 3rd Saturday = half day
        if (isThirdSaturdayStr(dk)) {
          const rec = attMap[dk] || null;
          if (rec?.startTime) {
            halfDayCount++;
            presentDays += 0.5;
          } else if (paidLeaveDates.has(dk)) {
            presentDays += 0.5;
          } else {
            absentDays += 0.5;
          }
          continue;
        }

        const rec = attMap[dk] || null;

        if (paidLeaveDates.has(dk)) {
          presentDays++;
          continue;
        }

        if (unpaidLeaveDates.has(dk)) {
          absentDays++;
          continue;
        }

        if (rec?.startTime) {
          presentDays++;
          const t = new Date(rec.startTime);
          if (t.getHours() > LATE_HOUR || (t.getHours() === LATE_HOUR && t.getMinutes() > LATE_MIN)) {
            lateCount++;
          }
          if (rec.deductions && rec.deductions > 0) {
            lunchPenalty += rec.deductions;
          }
        } else {
          absentDays++;
        }
      }

      // ── Deductions (off earned salary, not basic) ────────────────────────
      const absentDeduction      = Math.round(absentDays   * perDaySalary);
      const halfDayDeduction     = Math.round(halfDayCount * perDaySalary * 0.5);
      const lateDeduction        = calcLatePenalty(lateCount);
      const unpaidLeaveDeduction = Math.round(unpaidLeaveDates.size * perDaySalary);
      const lunchPenaltyRounded  = Math.round(lunchPenalty);

      const totalDeduction =
        absentDeduction +
        halfDayDeduction +
        lateDeduction +
        unpaidLeaveDeduction +
        lunchPenaltyRounded;

      // ── Reimbursements ───────────────────────────────────────────────────
      const [approvedReibs, pendingReibs] = await Promise.all([
        Reimbursement.find({ employee: empId, status: "Approved", createdAt: { $gte: monthStart, $lt: monthEnd } }).lean(),
        Reimbursement.find({ employee: empId, status: "Pending",  createdAt: { $gte: monthStart, $lt: monthEnd } }).lean(),
      ]);
      const approvedReimAmount = approvedReibs.reduce((s, r) => s + (r.amount || 0), 0);
      const pendingReimAmount  = pendingReibs.reduce((s, r)  => s + (r.amount || 0), 0);

      // ── Overtime ─────────────────────────────────────────────────────────
      const approvedOT = await Overtime.find({
        employee: empId,
        status: "Approved",
        date: { $gte: monthStart, $lt: monthEnd },
      }).lean();

      let totalOTMinutes = 0;
      approvedOT.forEach((ot) => {
        if (!ot.startTime || !ot.endTime) return;
        const [sh, sm] = ot.startTime.split(":").map(Number);
        const [eh, em] = ot.endTime.split(":").map(Number);
        const diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff > 0) totalOTMinutes += diff;
      });

      const otHours    = Number((totalOTMinutes / 60).toFixed(2));
      const hourlyRate = basicSalary / (totalWorkingDays * WORKING_HOURS_PER_DAY);
      const otAmount   = Number((otHours * hourlyRate * OT_MULTIPLIER).toFixed(2));

      // ── Net Pay = earned salary − deductions + reimbursements + OT ───────
      const netPay = Number(
        (earnedSalary - totalDeduction + approvedReimAmount + otAmount).toFixed(2)
      );

      // ── Save ──────────────────────────────────────────────────────────────
      const shortId   = String(empId).slice(-4).toUpperCase();
      const payrollId = `PAY-${year}${monthStr}-${shortId}`;

      const saved = await SalaryReport.findOneAndUpdate(
        { employee: empId, month, year },
        {
          $set: {
            employee:    empId,
            month,
            year,
            payrollId,
            basicSalary,
            workingDays:        totalWorkingDays,
            elapsedWorkingDays, // how many days counted so far
            earnedSalary,       // pro-rated if mid-month
            isPartialMonth:     isCurrentMonth,
            generatedOn:        getTodayStr(),
            presentDays:  Number(presentDays.toFixed(1)),
            absentDays:   Number(absentDays.toFixed(1)),
            lateCount,
            halfDayCount,
            deductions: {
              absent:      absentDeduction,
              halfDay:     halfDayDeduction,
              late:        lateDeduction,
              unpaidLeave: unpaidLeaveDeduction,
              lunch:       lunchPenaltyRounded,
              other:       0,
              total:       totalDeduction,
            },
            overtime: {
              hours:  otHours,
              amount: otAmount,
            },
            reimbursement: {
              approved: approvedReimAmount,
              pending:  pendingReimAmount,
            },
            netPay,
          },
          $setOnInsert: { status: "Pending" },
        },
        { upsert: true, new: true }
      );

      results.push(saved);
    }

    return res.json({ success: true, count: results.length, data: results });

  } catch (err) {
    console.error("Salary generation error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}



// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/hr/Employee";
// import Attendance from "@/models/employees/Attendance";
// import LeaveApplication from "@/models/employees/LeaveApplication";
// import Reimbursement from "@/models/employees/Reimbursement";
// import SalaryReport from "@/models/hr/SalaryReport";
// import { getEmployeeFromToken } from "@/utils/auth";
// import Overtime from "@/models/employees/Overtime";


// /* ================= LATE PENALTY SLAB ================= */
// function calculateLatePenalty(lateCount) {
//   if (lateCount <= 2) return 0;
//   if (lateCount === 3) return 500;
//   if (lateCount <= 5) return 1500;
//   if (lateCount <= 9) return 3500;
//   return 5000;
// }


// const WORKING_DAYS = 26;
// const WORKING_HOURS_PER_DAY = 8;
// const OT_MULTIPLIER = 1.5;


// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   try {
//     await dbConnect();

//     /* ================= AUTH ================= */
//     const { employee, error } = await getEmployeeFromToken(req);

//     if (error || !employee || employee.role !== "admin") {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     const { month, year } = req.body;

//     const employees = await Employee.find({ isActive: true });
//     const results = [];

//     for (const emp of employees) {
//       if (!emp.salary?.monthlySalary) continue;

//       const basicSalary = emp.salary.monthlySalary;

//       const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
//       const perDaySalary = basicSalary / totalDaysInMonth;

//       /* ================= ATTENDANCE ================= */
//       const attendance = await Attendance.find({
//         employee: emp._id,
//         date: {
//           $gte: `${year}-${String(month + 1).padStart(2, "0")}-01`,
//           $lte: `${year}-${String(month + 1).padStart(2, "0")}-31`,
//         },
//       });

//       // ✅ Present days (unique)
//       const presentDays = new Set(
//         attendance.filter(a => a.startTime).map(a => a.date)
//       ).size;

//       const absentDays = totalDaysInMonth - presentDays;
//       const absentDeduction = absentDays * perDaySalary;

//       // ✅ LATE COUNT (policy based)
//       const lateCount = attendance.filter(a => a.isLate).length;
//       const lateDeduction = calculateLatePenalty(lateCount);

//       // Other deductions (lunch / misc)
//       const otherDeduction = attendance.reduce(
//         (sum, a) => sum + (a.deductions || 0),
//         0
//       );

//       /* ================= UNPAID LEAVE ================= */
//       const unpaidLeaves = await LeaveApplication.find({
//         employee: emp._id,
//         status: "Approved",
//         leaveType: "Casual Leave",
//         "policyFlags.sandwichLeave": true,
//         startDate: {
//           $gte: new Date(year, month, 1),
//           $lt: new Date(year, month + 1, 1),
//         },
//       });

//       const unpaidLeaveDays = unpaidLeaves.reduce(
//         (sum, l) => sum + l.totalDays,
//         0
//       );

//       const unpaidLeaveDeduction = unpaidLeaveDays * perDaySalary;

//       /* ================= REIMBURSEMENT (PENDING ONLY) ================= */
//       const pendingReimbursements = await Reimbursement.find({
//         employee: emp._id,
//         status: "Pending",
//         createdAt: {
//           $gte: new Date(year, month, 1),
//           $lt: new Date(year, month + 1, 1),
//         },
//       });

//       const pendingReimAmount = pendingReimbursements.reduce(
//         (sum, r) => sum + r.amount,
//         0
//       );



//       /* ================= OVERTIME (APPROVED ONLY) ================= */
//         const approvedOT = await Overtime.find({
//           employee: emp._id,
//           status: "Approved",
//           date: {
//             $gte: new Date(year, month, 1),
//             $lt: new Date(year, month + 1, 1),
//           },
//         });

//         // ⏱ Calculate total OT hours
//         let totalOTMinutes = 0;

//         approvedOT.forEach((ot) => {
//           const [sh, sm] = ot.startTime.split(":").map(Number);
//           const [eh, em] = ot.endTime.split(":").map(Number);

//           const startMinutes = sh * 60 + sm;
//           const endMinutes = eh * 60 + em;

//           if (endMinutes > startMinutes) {
//             totalOTMinutes += endMinutes - startMinutes;
//           }
//         });

//         const otHours = Number((totalOTMinutes / 60).toFixed(2));



//         // 💰 OT Amount calculation
// const hourlyRate =
//   basicSalary / (WORKING_DAYS * WORKING_HOURS_PER_DAY);

// const otAmount = Number(
//   (otHours * hourlyRate * OT_MULTIPLIER).toFixed(2)
// );



//       /* ================= TOTAL ================= */
//       const totalDeduction =
//         absentDeduction +
//         lateDeduction +
//         unpaidLeaveDeduction +
//         otherDeduction;

//       const netPay =
//         basicSalary -
//         totalDeduction +
//         pendingReimAmount +
//         otAmount;


//       /* ================= SAVE SALARY ================= */
//       const payrollId = `VN${Math.floor(1000 + Math.random() * 9000)}`;

//       const salary = await SalaryReport.findOneAndUpdate(
//         { employee: emp._id, month, year },
//         {
//           employee: emp._id,
//           month,
//           year,
//           payrollId,
//           basicSalary,
//           deductions: {
//             absent: absentDeduction,
//             late: lateDeduction,
//             unpaidLeave: unpaidLeaveDeduction,
//             other: otherDeduction,
//             total: totalDeduction,
//           },
//           reimbursement: {
//             pending: pendingReimAmount,
//           },

//           overtime: {
//           hours: otHours,
//           amount: otAmount,
//         },
//           netPay,
//         },
//         { upsert: true, new: true }
//       );

//       results.push(salary);
//     }

//     return res.json({ success: true, data: results });
//   } catch (err) {
//     console.error("Salary generation error:", err);
//     return res.status(500).json({ success: false });
//   }
// }
