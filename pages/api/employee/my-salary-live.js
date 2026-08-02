// GET /api/employee/my-salary-live?month=X&year=Y
// Calculates salary for the requesting employee in real-time without saving to DB.
// Same logic as admin/salary/generate.js — runs for a single employee only (~150ms).

import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import LeaveApplication from "@/models/employees/LeaveApplication";
import Reimbursement from "@/models/employees/Reimbursement";
import Overtime from "@/models/employees/Overtime";
import Holiday from "@/models/Holiday";
import DeductionWaiverRequest from "@/models/employees/DeductionWaiverRequest";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

// ── Policy (mirrors generate.js) ────────────────────────────────────────────
const WORKING_HOURS_PER_DAY = 8;
const OT_MULTIPLIER         = 1.5;
const LATE_HOUR             = 10;
const LATE_MIN              = 10;

function calcLatePenalty(n)  { return n * 250; }

function isSundayStr(dk) {
  return new Date(dk + "T00:00:00").getDay() === 0;
}

function isThirdSaturdayStr(dk) {
  const d = new Date(dk + "T00:00:00");
  if (d.getDay() !== 6) return false;
  let sat = 0;
  for (let i = 1; i <= d.getDate(); i++) {
    if (new Date(d.getFullYear(), d.getMonth(), i).getDay() === 6) sat++;
  }
  return sat === 3;
}

function buildMonthDates(year, month) {
  const days = new Date(year, month + 1, 0).getDate();
  const ms   = String(month + 1).padStart(2, "0");
  const arr  = [];
  for (let d = 1; d <= days; d++)
    arr.push(`${year}-${ms}-${String(d).padStart(2, "0")}`);
  return arr;
}

function toDateStr(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getTodayStr() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}-${String(n.getDate()).padStart(2,"0")}`;
}

function countWorkingDays(allDates, holidayDates) {
  let c = 0;
  for (const dk of allDates) {
    if (isSundayStr(dk))        continue;
    if (holidayDates.has(dk))   continue;
    if (isThirdSaturdayStr(dk)) { c += 0.5; continue; }
    c++;
  }
  return c || 1;
}

function countElapsedWorkingDays(allDates, holidayDates, cutoff) {
  let c = 0;
  for (const dk of allDates) {
    if (dk > cutoff)            break;
    if (isSundayStr(dk))        continue;
    if (holidayDates.has(dk))   continue;
    if (isThirdSaturdayStr(dk)) { c += 0.5; continue; }
    c++;
  }
  return c || 1;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const basicSalary = employee.salary?.monthlySalary;
    if (!basicSalary) {
      return res.json({ success: true, report: null, reason: "no_salary_set" });
    }

    const month = Number(req.query.month ?? new Date().getMonth()); // 0-indexed
    const year  = Number(req.query.year  ?? new Date().getFullYear());

    const monthStr   = String(month + 1).padStart(2, "0");
    const dateFrom   = `${year}-${monthStr}-01`;
    const dateTo     = `${year}-${monthStr}-${String(new Date(year, month+1, 0).getDate()).padStart(2,"0")}`;
    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 1);
    const allDates   = buildMonthDates(year, month);
    const todayStr   = getTodayStr();

    const isCurrentMonth = todayStr >= dateFrom && todayStr <= dateTo;
    const cutoffStr      = isCurrentMonth ? todayStr : dateTo;

    const empId = employee._id;

    // ── Joining-date boundary ────────────────────────────────────────────
    // dateOfJoining is the authoritative start of employment — no salary/
    // attendance before it.
    const joinDateStr = employee.professional?.dateOfJoining
      ? toDateStr(employee.professional.dateOfJoining)
      : null;

    if (joinDateStr && joinDateStr > dateTo) {
      return res.json({ success: true, report: null, reason: "not_joined_yet" });
    }

    const effectiveStart = joinDateStr && joinDateStr > dateFrom ? joinDateStr : dateFrom;

    // ── Public holidays ──────────────────────────────────────────────────────
    const holidays = await Holiday.find({
      isActive: true, type: "public",
      startDate: { $lt: monthEnd },
      endDate:   { $gte: monthStart },
    }).lean();

    const holidayDates = new Set();
    holidays.forEach((h) => {
      const s   = new Date(Math.max(new Date(h.startDate), monthStart));
      const e   = new Date(Math.min(new Date(h.endDate), new Date(monthEnd - 1)));
      const cur = new Date(s);
      while (cur <= e) { holidayDates.add(toDateStr(cur)); cur.setDate(cur.getDate()+1); }
    });

    // ── Working day counts ───────────────────────────────────────────────────
    const totalWorkingDays   = countWorkingDays(allDates, holidayDates);
    const elapsedWorkingDays = countElapsedWorkingDays(allDates, holidayDates, cutoffStr);

    // ── Per-day rate & earned salary — fixed 30-day-month basis ─────────────
    const perDaySalary = basicSalary / 30;
    // Full month, no join/exit boundary → full basicSalary regardless of the
    // actual days in that particular month. Joined mid-month → paid for
    // (30 − join-day-of-month) days (e.g. joined on the 6th → 30−6 = 24
    // days' pay), always relative to a fixed 30-day month. Already
    // employed, current month still in progress (live estimate) → paid for
    // calendar days elapsed so far this month, capped to 30.
    const isFullMonthNoBoundary = effectiveStart === dateFrom && cutoffStr === dateTo;
    let earnedSalary;
    if (isFullMonthNoBoundary) {
      earnedSalary = basicSalary;
    } else if (effectiveStart !== dateFrom) {
      const joinDay     = Number(effectiveStart.slice(-2));
      const daysPayable = Math.max(0, 30 - joinDay);
      earnedSalary = Number((perDaySalary * daysPayable).toFixed(2));
    } else {
      const cutoffDay   = Number(cutoffStr.slice(-2));
      const daysPayable = Math.min(cutoffDay, 30);
      earnedSalary = Number((perDaySalary * daysPayable).toFixed(2));
    }

    // ── Attendance ───────────────────────────────────────────────────────────
    const attRecords = await Attendance.find({
      employee: empId,
      date: { $gte: dateFrom, $lte: cutoffStr },
    }).lean();
    const attMap = {};
    attRecords.forEach((r) => { attMap[r.date] = r; });

    // ── Approved leaves ──────────────────────────────────────────────────────
    const approvedLeaves = await LeaveApplication.find({
      employee: empId,
      status: "Approved",
      startDate: { $lt: monthEnd },
      endDate:   { $gte: monthStart },
    }).lean();

    const paidLeaveDates      = new Set();
    const unpaidLeaveDates    = new Set();
    const unpaidHalfDayDates  = new Set();

    approvedLeaves.forEach((leave) => {
      // Half Day leave handled separately — single day, paid or unpaid
      if (leave.leaveType === "Half Day") {
        const dk = toDateStr(new Date(leave.startDate));
        if (leave.isPaid === false) unpaidHalfDayDates.add(dk);
        else                        paidLeaveDates.add(dk);
        return;
      }
      const s   = new Date(Math.max(new Date(leave.startDate), monthStart));
      const e   = new Date(Math.min(new Date(leave.endDate), new Date(monthEnd - 1)));
      const cur = new Date(s);
      while (cur <= e) {
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

    // ── Walk days ────────────────────────────────────────────────────────────
    let presentDays  = 0;
    let absentDays   = 0;
    let lateCount    = 0;
    let halfDayCount = 0;
    let lunchPenalty = 0;

    for (const dk of allDates) {
      if (dk > cutoffStr) break;
      if (dk < effectiveStart) continue; // not employed yet
      if (isSundayStr(dk)) continue;

      if (holidayDates.has(dk)) { presentDays++; continue; }

      // 3rd Saturday — company pays a full day for it, despite being a
      // half-working-day, so it counts as a full present day, never deducted.
      if (isThirdSaturdayStr(dk)) {
        presentDays += 1;
        continue;
      }

      const rec = attMap[dk] || null;

      if (paidLeaveDates.has(dk))     { presentDays++; continue; }
      if (unpaidHalfDayDates.has(dk)) { halfDayCount++; continue; }
      if (unpaidLeaveDates.has(dk))   { continue; }

      if (rec?.startTime) {
        presentDays++;
        const t = new Date(rec.startTime);
        if (t.getHours() > LATE_HOUR || (t.getHours() === LATE_HOUR && t.getMinutes() > LATE_MIN)) {
          lateCount++;
        }
        if (rec.deductions && rec.deductions > 0) lunchPenalty += rec.deductions;
      } else if (rec?.isHalfDay) {
        halfDayCount++;
      } else {
        absentDays++;
      }
    }

    // ── Raw deductions ───────────────────────────────────────────────────────
    let absentDeduction      = Math.round(absentDays   * perDaySalary);
    let halfDayDeduction     = Math.round(halfDayCount * perDaySalary * 0.5);
    let lateDeduction        = calcLatePenalty(lateCount);
    let unpaidLeaveDeduction = Math.round(unpaidLeaveDates.size * perDaySalary);
    let lunchPenaltyRounded  = Math.round(lunchPenalty);

    // ── Approved waivers ─────────────────────────────────────────────────────
    const approvedWaivers = await DeductionWaiverRequest.find({
      employee: empId, month, year, status: "Approved",
    }).lean();

    let waivedAbsent = 0, waivedHalfDay = 0, waivedLate = 0,
        waivedUnpaid = 0, waivedLunch   = 0, waivedOther = 0;

    for (const w of approvedWaivers) {
      const amt = Number(w.amount) || 0;
      switch (w.deductionType) {
        case "absent":      waivedAbsent  += amt; break;
        case "halfDay":     waivedHalfDay += amt; break;
        case "late":        waivedLate    += amt; break;
        case "unpaidLeave": waivedUnpaid  += amt; break;
        case "lunch":       waivedLunch   += amt; break;
        default:            waivedOther   += amt; break;
      }
    }

    absentDeduction      = Math.max(0, absentDeduction      - waivedAbsent);
    halfDayDeduction     = Math.max(0, halfDayDeduction     - waivedHalfDay);
    lateDeduction        = Math.max(0, lateDeduction        - waivedLate);
    unpaidLeaveDeduction = Math.max(0, unpaidLeaveDeduction - waivedUnpaid);
    lunchPenaltyRounded  = Math.max(0, lunchPenaltyRounded  - waivedLunch);

    const totalWaived   = waivedAbsent + waivedHalfDay + waivedLate + waivedUnpaid + waivedLunch + waivedOther;
    const totalDeduction = absentDeduction + halfDayDeduction + lateDeduction + unpaidLeaveDeduction + lunchPenaltyRounded;

    // ── Reimbursements ───────────────────────────────────────────────────────
    const [approvedReibs, pendingReibs] = await Promise.all([
      Reimbursement.find({ employee: empId, status: "Approved", createdAt: { $gte: monthStart, $lt: monthEnd } }).lean(),
      Reimbursement.find({ employee: empId, status: "Pending",  createdAt: { $gte: monthStart, $lt: monthEnd } }).lean(),
    ]);
    const approvedReimAmount = approvedReibs.reduce((s, r) => s + (r.amount || 0), 0);
    const pendingReimAmount  = pendingReibs.reduce((s, r)  => s + (r.amount || 0), 0);

    // ── Overtime ─────────────────────────────────────────────────────────────
    const approvedOT = await Overtime.find({
      employee: empId, status: "Approved",
      date: { $gte: monthStart, $lt: monthEnd },
    }).lean();

    let totalOTMinutes = 0;
    approvedOT.forEach((ot) => {
      if (!ot.startTime || !ot.endTime) return;
      const [sh, sm] = ot.startTime.split(":").map(Number);
      const [eh, em] = ot.endTime.split(":").map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff <= 0) diff += 24 * 60; // overnight
      if (diff > 0) {
        const extMins = (ot.extensions || [])
          .filter(e => e.status === "Approved")
          .reduce((s, e) => s + (e.extraMins || 0), 0);
        totalOTMinutes += diff + extMins;
      }
    });

    const otHours    = Number((totalOTMinutes / 60).toFixed(2));
    const hourlyRate = basicSalary / (30 * WORKING_HOURS_PER_DAY); // fixed 30-day-month basis
    const otAmount   = Number((otHours * hourlyRate * OT_MULTIPLIER).toFixed(2));

    // ── Net pay ──────────────────────────────────────────────────────────────
    const netPay = Number(
      (earnedSalary - totalDeduction + approvedReimAmount + otAmount).toFixed(2)
    );

    return res.json({
      success: true,
      isLive:  true, // flag so the UI can show "Live" badge
      report: {
        basicSalary,
        earnedSalary,
        netPay,
        isPartialMonth:     isCurrentMonth,
        workingDays:        totalWorkingDays,
        elapsedWorkingDays,
        presentDays:        Number(presentDays.toFixed(1)),
        absentDays:         Number(absentDays.toFixed(1)),
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
        overtime: { hours: otHours, amount: otAmount },
        reimbursement: { approved: approvedReimAmount, pending: pendingReimAmount },
      },
    });

  } catch (err) {
    console.error("Live salary calc error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
