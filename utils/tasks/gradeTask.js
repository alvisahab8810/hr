/**
 * Task punctuality grade system.
 *
 * Points based on how late a task was completed vs its dueDate:
 *   on time (≤ 0 h)   → 5
 *   ≤ 0.5 h late      → 4
 *   ≤ 1.0 h late      → 3.5
 *   ≤ 1.5 h late      → 3
 *   <  2.0 h late     → 2
 *   ≤  3.0 h late     → 1
 *   >  3.0 h late     → 0
 */

/**
 * Calculate grade for a single task.
 * @param {object} task - Task document (needs dueDate, status, submittedAt, updatedAt)
 * @returns {{ points: number, hoursLate: number, onTime: boolean } | null}
 *          null if task has no dueDate (ungraded)
 */
export function gradeTask(task) {
  if (!task.dueDate) return null;

  const due = new Date(task.dueDate);

  // For completed/review tasks use submittedAt (employee clicked "done"),
  // falling back to updatedAt as a best approximation.
  const isFinished = task.status === "completed" || task.status === "review";
  const finishedAt = isFinished
    ? new Date(task.submittedAt || task.updatedAt || Date.now())
    : new Date(); // still open — measure lateness right now

  const hoursLate = (finishedAt - due) / (1000 * 60 * 60);

  let points;
  if      (hoursLate <= 0)   points = 5;
  else if (hoursLate <= 0.5) points = 4;
  else if (hoursLate <= 1)   points = 3.5;
  else if (hoursLate <= 1.5) points = 3;
  else if (hoursLate < 2)    points = 2;
  else if (hoursLate <= 3)   points = 1;
  else                       points = 0;

  return { points, hoursLate, onTime: hoursLate <= 0 };
}

/**
 * Convert an average points score (0-5) to a letter grade with colour.
 */
export function pointsToGrade(avg) {
  if (avg === null || avg === undefined) return { label: "—", color: "#94A3B8", bg: "#F1F5F9" };
  if (avg >= 4.5) return { label: "A+", color: "#15803D", bg: "#DCFCE7" };
  if (avg >= 4.0) return { label: "A",  color: "#16A34A", bg: "#F0FDF4" };
  if (avg >= 3.5) return { label: "B+", color: "#1D4ED8", bg: "#DBEAFE" };
  if (avg >= 3.0) return { label: "B",  color: "#2563EB", bg: "#EFF6FF" };
  if (avg >= 2.0) return { label: "C",  color: "#B45309", bg: "#FEF3C7" };
  if (avg >= 1.0) return { label: "D",  color: "#EA580C", bg: "#FFF7ED" };
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
