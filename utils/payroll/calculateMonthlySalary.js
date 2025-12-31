import { HR_POLICY } from "@/config/hrPolicy";

/**
 * Calculate monthly salary & deductions for a single employee.
 */
export function calculateMonthlySalary({
  baseSalary,
  attendanceRecords = [],
  leaveRecords = [],
}) {
  const perDaySalary = baseSalary / HR_POLICY.workingDaysPerMonth;
  let totalDeductions = 0;
  let lateMarks = 0;
  let lunchPenalty = 0;
  let lopDays = 0;
  let halfDayDeductions = 0;

  attendanceRecords.forEach((day) => {
    // Late Arrival
    const lateTime = new Date(day.checkIn);
    const [h, m] = HR_POLICY.lateArrival.graceTime.split(":").map(Number);
    const cutoff = new Date(day.date);
    cutoff.setHours(h, m, 0, 0);
    if (lateTime > cutoff) lateMarks++;

    // Lunch Penalty
    if (day.lunchOverMins) {
      lunchPenalty += day.lunchOverMins * HR_POLICY.lunchPenaltyPerMinute;
    }

    // Half-Day
    if (day.halfDay) {
      halfDayDeductions += perDaySalary * HR_POLICY.halfDaySalaryFraction;
    }

    // LOP (Absent)
    if (day.absent) lopDays++;
  });

  // Late Arrival Fine
  const lateFine =
    HR_POLICY.lateArrival.fines.find((f) => lateMarks <= f.count)?.fine ||
    5000;
  totalDeductions +=
    lateFine + lunchPenalty + lopDays * perDaySalary + halfDayDeductions;

  const finalPayable = baseSalary - totalDeductions;

  return {
    baseSalary,
    perDaySalary,
    totalDeductions,
    finalPayable,
    breakdown: {
      lateMarks,
      lateFine,
      lunchPenalty,
      lopDays,
      halfDayDeductions,
    },
  };
}
