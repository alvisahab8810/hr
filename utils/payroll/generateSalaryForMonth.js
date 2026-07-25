// utils/payroll/generateSalaryForMonth.js
//
// Shared salary-recalculation logic used by both:
//   - pages/api/admin/salary/generate.js  (Salary Report page)
//   - pages/api/admin/dashboard/summary.js (Home dashboard payroll card)
//
// Recomputing + upserting SalaryReport from the SAME function in both places
// keeps "Total Net Pay" consistent between the two screens — previously the
// dashboard read whatever SalaryReport rows happened to already be in Mongo
// (stale, from whenever the Salary Report page was last opened), while the
// Salary Report page always recomputed "as of right now" first.
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
import Employee from "@/models/hr/Employee";
import Attendance from "@/models/employees/Attendance";
import LeaveApplication from "@/models/employees/LeaveApplication";
import Reimbursement from "@/models/employees/Reimbursement";
import SalaryReport from "@/models/hr/SalaryReport";
import Overtime from "@/models/employees/Overtime";
import Holiday from "@/models/Holiday";
import DeductionWaiverRequest from "@/models/employees/DeductionWaiverRequest";

// ── Policy ─────────────────────────────────────────────────────────────────────
const WORKING_HOURS_PER_DAY = 8;
const OT_MULTIPLIER         = 1.5;
const LATE_HOUR             = 10;
const LATE_MIN              = 10;

// ₹250 deducted for every late arrival after 10:10 AM
function calcLatePenalty(lateCount) {
  return lateCount * 250;
}

export function isSundayStr(dk) {
  return new Date(dk + "T00:00:00").getDay() === 0;
}

export function isThirdSaturdayStr(dk) {
  const d = new Date(dk + "T00:00:00");
  if (d.getDay() !== 6) return false;
  let satCount = 0;
  for (let i = 1; i <= d.getDate(); i++) {
    if (new Date(d.getFullYear(), d.getMonth(), i).getDay() === 6) satCount++;
  }
  return satCount === 3;
}

export function buildMonthDates(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStr    = String(month + 1).padStart(2, "0");
  const dates       = [];
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(`${year}-${monthStr}-${String(d).padStart(2, "0")}`);
  }
  return dates;
}

export function getTodayStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function toDateStr(date) {
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
export function countElapsedWorkingDays(allDates, holidayDates, todayStr) {
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

// Count working days within [fromStr, toStr] inclusive — used to prorate a
// joining-month employee's earned salary from their actual dateOfJoining
// instead of the 1st of the month.
export function countWorkingDaysInRange(allDates, holidayDates, fromStr, toStr) {
  let count = 0;
  for (const dk of allDates) {
    if (dk < fromStr || dk > toStr) continue;
    if (isSundayStr(dk))            continue;
    if (holidayDates.has(dk))       continue;
    if (isThirdSaturdayStr(dk))     { count += 0.5; continue; }
    count++;
  }
  return count;
}

// Recomputes and upserts SalaryReport rows for every active employee for
// the given (0-indexed) month/year. Returns the saved documents.
export async function generateSalaryForMonth(month, year) {
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

  const employees = await Employee.find({
    isActive: true,
    "professional.department": { $ne: "Farmer" },
  }).lean();
  const results   = [];

  for (const emp of employees) {
    const basicSalary = emp.salary?.monthlySalary;
    if (!basicSalary) continue;

    const empId = emp._id;

    // Per-day rate based on 30-day calendar month (₹28,000 ÷ 30 = ₹933.33/day)
    const perDaySalary = basicSalary / 30;

    // ── Joining-date boundary ───────────────────────────────────────────
    // An employee's dateOfJoining (set at invite time) is the authoritative
    // start of employment. Days before it must never count as present,
    // absent, or paid — for attendance OR salary.
    const joinDateStr = emp.professional?.dateOfJoining
      ? toDateStr(emp.professional.dateOfJoining)
      : null;

    // Employee hasn't joined yet as of this month — no salary report for them.
    if (joinDateStr && joinDateStr > dateTo) continue;

    // Bound the start of this employee's counted period to their join date
    // (only matters if they joined during this exact month).
    const effectiveStart = joinDateStr && joinDateStr > dateFrom ? joinDateStr : dateFrom;

    // Earned salary = basicSalary prorated by this employee's own elapsed
    // working days (from their effectiveStart, not necessarily the 1st) over
    // the full month's working days. For employees who joined before this
    // month, effectiveStart === dateFrom, so this is unchanged from before.
    const employeeElapsedWorkingDays = countWorkingDaysInRange(allDates, holidayDates, effectiveStart, cutoffStr);
    const earnedSalary = Number((basicSalary * (employeeElapsedWorkingDays / totalWorkingDays)).toFixed(2));

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

    const paidLeaveDates     = new Set();
    const unpaidLeaveDates   = new Set();
    const unpaidHalfDayDates = new Set();

    approvedLeaves.forEach((leave) => {
      // Half Day leave handled separately — single day, paid or unpaid
      if (leave.leaveType === "Half Day") {
        const dk = toDateStr(new Date(leave.startDate));
        if (leave.isPaid === false) unpaidHalfDayDates.add(dk);
        else                        paidLeaveDates.add(dk);
        return;
      }
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

      // Before the employee joined — not employed yet, never present/absent
      if (dk < effectiveStart) continue;

      // Sunday = week off
      if (isSundayStr(dk)) continue;

      // Public holiday = paid present
      if (holidayDates.has(dk)) {
        presentDays++;
        continue;
      }

      // 3rd Saturday = paid half-day off — always presentDays += 0.5, never deducted
      if (isThirdSaturdayStr(dk)) {
        presentDays += 0.5;
        continue;
      }

      const rec = attMap[dk] || null;

      if (paidLeaveDates.has(dk)) {
        presentDays++;
        continue;
      }

      if (unpaidHalfDayDates.has(dk)) {
        halfDayCount++;
        continue;
      }

      if (unpaidLeaveDates.has(dk)) {
        continue; // counted separately in unpaidLeaveDeduction — do NOT add to absentDays
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
      } else if (rec?.isHalfDay) {
        halfDayCount++;
      } else {
        absentDays++;
      }
    }

    // ── Deductions (off earned salary, not basic) ────────────────────────
    let absentDeduction      = Math.round(absentDays   * perDaySalary);
    let halfDayDeduction     = Math.round(halfDayCount * perDaySalary * 0.5);
    let lateDeduction        = calcLatePenalty(lateCount);
    let unpaidLeaveDeduction = Math.round(unpaidLeaveDates.size * perDaySalary);
    let lunchPenaltyRounded  = Math.round(lunchPenalty);

    // ── Apply approved deduction waivers ────────────────────────────────
    const approvedWaivers = await DeductionWaiverRequest.find({
      employee: empId,
      month,
      year,
      status: "Approved",
    }).lean();

    let waivedAbsent      = 0;
    let waivedHalfDay     = 0;
    let waivedLate        = 0;
    let waivedUnpaidLeave = 0;
    let waivedLunch       = 0;
    let waivedOther       = 0;

    for (const w of approvedWaivers) {
      const amt = Number(w.amount) || 0;
      switch (w.deductionType) {
        case "absent":      waivedAbsent      += amt; break;
        case "halfDay":     waivedHalfDay     += amt; break;
        case "late":        waivedLate        += amt; break;
        case "unpaidLeave": waivedUnpaidLeave += amt; break;
        case "lunch":       waivedLunch       += amt; break;
        default:            waivedOther       += amt; break;
      }
    }

    // Cap waivers so deductions never go below 0
    absentDeduction      = Math.max(0, absentDeduction      - waivedAbsent);
    halfDayDeduction     = Math.max(0, halfDayDeduction     - waivedHalfDay);
    lateDeduction        = Math.max(0, lateDeduction        - waivedLate);
    unpaidLeaveDeduction = Math.max(0, unpaidLeaveDeduction - waivedUnpaidLeave);
    lunchPenaltyRounded  = Math.max(0, lunchPenaltyRounded  - waivedLunch);

    const totalWaived =
      waivedAbsent + waivedHalfDay + waivedLate + waivedUnpaidLeave + waivedLunch + waivedOther;

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
            waived:      totalWaived,
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

  return results;
}
