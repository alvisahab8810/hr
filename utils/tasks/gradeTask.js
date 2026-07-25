/**
 * Task punctuality grade system.
 *
 * This mirrors the canonical scoring logic in utils/tasks/employeeGrade.js
 * (the employee-side "Grades" tab formula) so admin screens and employee
 * screens always agree on how a task is graded:
 *
 *   on time (≤ 0 h late)  → 5 (A)
 *   ≤  4 h late           → 4 (B)
 *   ≤ 12 h late           → 3 (C)
 *   ≤ 24 h late           → 2 (D)
 *   >  24 h late          → 1 (F)
 *   overdue, not submitted → 0
 *   not yet due, not submitted → ungraded (null)
 *
 * Deadline resolution supports production-type tasks, which track their
 * deadline per-stage (task.stages[].deadline) instead of a single top-level
 * dueDate.
 */

// Returns the most relevant deadline for a task — stage deadline first for production tasks
function getStageDeadline(task) {
  if (task?.taskType === "production" && task.stages?.length) {
    const deadlines = task.stages
      .filter(s => s.deadline && !s.done)
      .map(s => new Date(s.deadline));
    if (deadlines.length) return deadlines.reduce((a, b) => a < b ? a : b);
    // All stages done — use the earliest deadline anyway
    const all = task.stages.map(s => s.deadline).filter(Boolean).map(x => new Date(x));
    if (all.length) return all.reduce((a, b) => a < b ? a : b);
  }
  return task?.dueDate ? new Date(task.dueDate) : null;
}

/**
 * Calculate grade for a single task.
 * @param {object} task - Task document
 * @returns {{ points: number, hoursLate: number, onTime: boolean } | null}
 *          null if the task has no resolvable deadline, or isn't due yet and hasn't been submitted.
 */
export function gradeTask(task) {
  const due = getStageDeadline(task);
  if (!due) return null;

  // Submission time: stage doneAt for production tasks, else submittedAt/updatedAt.
  let submittedAt = null;
  if (task.taskType === "production" && task.stages?.length) {
    const doneStages = task.stages.filter(s => s.done || s.approved);
    const first = doneStages[0];
    if (first?.doneAt) submittedAt = new Date(first.doneAt);
  }
  if (!submittedAt && task.submittedAt) submittedAt = new Date(task.submittedAt);
  if (!submittedAt && task.status === "completed") {
    submittedAt = new Date(task.updatedAt || Date.now());
  }

  const now = new Date();
  if (!submittedAt) {
    if (due < now) return { points: 0, hoursLate: (now - due) / 3600000, onTime: false }; // overdue, not submitted
    return null; // not yet due
  }

  const hoursLate = (submittedAt - due) / 3600000;
  let points;
  if      (hoursLate <= 0)  points = 5;
  else if (hoursLate <= 4)  points = 4;
  else if (hoursLate <= 12) points = 3;
  else if (hoursLate <= 24) points = 2;
  else                      points = 1;

  return { points, hoursLate, onTime: hoursLate <= 0 };
}

/**
 * Convert an average points score (0-5) to a letter grade with colour.
 * Bands match utils/tasks/employeeGrade.js's calcGrade().
 */
export function pointsToGrade(avg) {
  if (avg === null || avg === undefined) return { label: "—", color: "#94A3B8", bg: "#F1F5F9" };
  if (avg >= 4.5) return { label: "A+", color: "#15803D", bg: "#DCFCE7" };
  if (avg >= 4.0) return { label: "A",  color: "#16A34A", bg: "#F0FDF4" };
  if (avg >= 3.5) return { label: "B+", color: "#1D4ED8", bg: "#DBEAFE" };
  if (avg >= 3.0) return { label: "B",  color: "#2563EB", bg: "#EFF6FF" };
  if (avg >= 2.5) return { label: "C",  color: "#B45309", bg: "#FEF3C7" };
  if (avg >= 1.5) return { label: "D",  color: "#EA580C", bg: "#FFF7ED" };
  return { label: "F", color: "#DC2626", bg: "#FEE2E2" };
}

/**
 * Summarise an array of tasks into a grade object for one employee.
 * @param {object[]} tasks
 * @returns {{ avgPoints: number|null, grade: object, gradedCount: number, onTimeCount: number, lateCount: number }}
 */
export function calcEmployeeGrade(tasks) {
  const graded = tasks
    .map(t => gradeTask(t))
    .filter(Boolean);

  if (graded.length === 0) {
    return { avgPoints: null, grade: pointsToGrade(null), gradedCount: 0, onTimeCount: 0, lateCount: 0 };
  }

  const avgPoints   = Math.round((graded.reduce((s, g) => s + g.points, 0) / graded.length) * 10) / 10;
  const onTimeCount = graded.filter(g => g.onTime).length;
  const lateCount   = graded.length - onTimeCount;

  return {
    avgPoints,
    grade: pointsToGrade(avgPoints),
    gradedCount: graded.length,
    onTimeCount,
    lateCount,
  };
}
