// utils/leavePolicy.js
import { differenceInBusinessDays, isWeekend, eachDayOfInterval } from "date-fns";

/**
 * Determine if leave spans across a weekend/holiday "sandwich".
 * Example: Fri + Mon leave where Sat/Sun in middle -> sandwichFlag.
 */
export function detectSandwich(fromDate, toDate, holidays = []) {
  const days = eachDayOfInterval({ start: fromDate, end: toDate });
  let hasWeekendOrHoliday = false;
  for (const d of days) {
    if (isWeekend(d)) {
      hasWeekendOrHoliday = true;
      break;
    }
    if (holidays.some((h) => sameDay(new Date(h.date), d))) {
      hasWeekendOrHoliday = true;
      break;
    }
  }
  return hasWeekendOrHoliday;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Count days inclusive
export function daysInclusive(fromDate, toDate) {
  return Math.floor((toDate - fromDate) / 86400000) + 1;
}

// Count working days (Mon–Fri) inclusive
export function workingDaysInclusive(fromDate, toDate) {
  return differenceInBusinessDays(toDate, fromDate) + 1; // date-fns counts exclusive; +1 inclusive
}

/**
 * Evaluate policy rules and return meta object.
 * @param {Object} params
 * @param {String} type "Personal" | "Sick"
 * @param {Date} fromDate
 * @param {Date} toDate
 * @param {Date} requestedOn date now
 * @param {Number} halfDaysUsedThisMonth count of approved half days already used
 * @param {Array<{date:Date}>} holidays
 * @param {Boolean} halfDayRequested
 * @param {Boolean} emergencyRequested
 * @returns policyMeta object
 */
export function evaluateLeavePolicy({
  type,
  fromDate,
  toDate,
  requestedOn,
  halfDaysUsedThisMonth = 0,
  holidays = [],
  halfDayRequested = false,
  emergencyRequested = false,
}) {
  const meta = {
    daysRequested: daysInclusive(fromDate, toDate),
    halfDay: halfDayRequested,
    advanceNoticeDays: null,
    noticeOk: true,
    medicalCertRequired: false,
    justificationRequired: false,
    dualApprovalRequired: false,
    emergency: !!emergencyRequested,
    sandwichFlag: false,
    halfDayAllowed: true,
    policyWarnings: [],
  };

  // Notice period (working days between today & fromDate)
  meta.advanceNoticeDays = differenceInBusinessDays(fromDate, requestedOn);
  if (meta.advanceNoticeDays < 0) meta.advanceNoticeDays = 0;

  // Sick Policy
  if (type === "Sick") {
    if (meta.daysRequested > 3) {
      meta.medicalCertRequired = true;
      meta.policyWarnings.push(
        "Medical certificate required for sick leave over 3 days."
      );
    }
    // Optional: mark if request is future-dated vs after absence.
  }

  // Personal Policy
  if (type === "Personal") {
    if (meta.daysRequested <= 3) {
      // needs 1–2 working days notice
      if (meta.advanceNoticeDays < 1) {
        meta.noticeOk = false;
        meta.policyWarnings.push(
          "Advance notice (1–2 working days) required for Personal leave up to 3 days."
        );
      }
    } else if (meta.daysRequested >= 4) {
      meta.justificationRequired = true;
      meta.dualApprovalRequired = true;
      meta.policyWarnings.push("Justification & dual approval required (>3 days).");
    }
  }

  // Half-day Policy
  if (halfDayRequested) {
    if (halfDaysUsedThisMonth >= 2) {
      meta.halfDayAllowed = false;
      meta.policyWarnings.push(
        "Max 2 half-days per month exceeded; will be treated as full-day leave."
      );
    }
  }

  // Sandwich Policy (weekend/holiday between)
  meta.sandwichFlag = detectSandwich(fromDate, toDate, holidays);
  if (meta.sandwichFlag) {
    meta.policyWarnings.push(
      "Leave spans weekend/holiday; prior discussion required."
    );
  }

  // Emergency
  if (emergencyRequested) {
    meta.policyWarnings.push("Emergency leave — justification required.");
    meta.justificationRequired = true; // escalate
  }

  return meta;
}
