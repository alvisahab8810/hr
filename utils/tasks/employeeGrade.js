// utils/tasks/employeeGrade.js
//
// Canonical task-grading logic. Originally lived only inside the employee
// "Grades" tab (pages/employee/tasks/index.js); extracted here so every
// screen that grades tasks — employee Grades tab, My Stats tab, employee
// dashboard, and the admin Team Performance page — uses the exact same
// scoring rules and month-scoping logic. This is what keeps the numbers
// consistent across screens.

// A task "belongs" to an employee if they're the primary assignee OR a stage
// assignee (production tasks assign different stages — S1/S2/S3/S4 — to
// different employees via stages[].assignedTo, which the top-level
// assignedTo field does not capture).
export function isTaskAssignedTo(task, empId) {
  const id = String(empId);
  if (String(task?.assignedTo?._id || task?.assignedTo || "") === id) return true;
  return (task?.stages || []).some(s =>
    (s.assignedTo || []).some(a => String(a?._id || a) === id)
  );
}

export function isOverdue(d) {
  if (!d) return false;
  const n = new Date(); n.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  return x < n;
}

// Returns the most relevant deadline for a task — stage deadline first for production tasks
export function getStageDeadline(task) {
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

// filterTasksByMonth — shared helper used by callers of calcGrade
export function filterTasksByMonth(tasks, month, year) {
  return tasks.filter(t => {
    const dl = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null);
    return dl && dl.getFullYear() === year && dl.getMonth() === month;
  });
}

export function calcGrade(tasks) {
  // Score each task 0-5 based on submission lateness vs deadline
  // 5=A(on time), 4=B(0-4h late), 3=C(4-12h late), 2=D(12-24h late), 1=F(24h+ late), 0=Incomplete
  // NOTE: callers are responsible for pre-filtering tasks to the desired month

  const total = tasks.length;
  if (total === 0) {
    return { letter:"—", color:"#94a3b8", rating:0, rate:0, total:0, completed:0, incomplete:0, aCnt:0, bCnt:0, cCnt:0, dCnt:0, fCnt:0 };
  }

  const scores = tasks.map(t => {
    const deadline = getStageDeadline(t) || (t.dueDate ? new Date(t.dueDate) : null);
    if (!deadline) return null;

    // Get submission time: stage doneAt for production, else submittedAt
    let submittedAt = null;
    if (t.taskType === "production" && t.stages?.length) {
      const doneStages = t.stages.filter(s => s.done || s.approved);
      const first = doneStages[0];
      if (first?.doneAt) submittedAt = new Date(first.doneAt);
    }
    if (!submittedAt && t.submittedAt) submittedAt = new Date(t.submittedAt);

    if (!submittedAt) {
      if (t.status === "completed") return 5; // completed but no time tracked → assume on time
      if (isOverdue(deadline))     return 0; // overdue, not submitted
      return null; // not yet due — exclude from scoring
    }

    const diffH = (submittedAt - deadline) / 3600000;
    if (diffH <= 0)  return 5; // A
    if (diffH <= 4)  return 4; // B
    if (diffH <= 12) return 3; // C
    if (diffH <= 24) return 2; // D
    return 1;                  // F
  }).filter(s => s !== null);

  const aCnt = scores.filter(s => s === 5).length;
  const bCnt = scores.filter(s => s === 4).length;
  const cCnt = scores.filter(s => s === 3).length;
  const dCnt = scores.filter(s => s === 2).length;
  const fCnt = scores.filter(s => s === 1).length;
  const incomplete = scores.filter(s => s === 0).length;
  const completed  = scores.filter(s => s > 0).length;

  const sum    = scores.reduce((a, b) => a + b, 0);
  const rating = scores.length > 0 ? Math.round((sum / scores.length) * 10) / 10 : 0;

  let letter, color;
  if (rating >= 4.5)     { letter = "A+"; color = "#16a34a"; }
  else if (rating >= 4.0) { letter = "A";  color = "#22c55e"; }
  else if (rating >= 3.5) { letter = "B+"; color = "#84cc16"; }
  else if (rating >= 3.0) { letter = "B";  color = "#f5a623"; }
  else if (rating >= 2.5) { letter = "C";  color = "#f59e0b"; }
  else if (rating >= 1.5) { letter = "D";  color = "#ef4444"; }
  else                    { letter = "F";  color = "#dc2626"; }

  const rate = total > 0 ? Math.round(aCnt / total * 100) : 0;

  return { letter, color, rating, rate, total, completed, incomplete, aCnt, bCnt, cCnt, dCnt, fCnt };
}
