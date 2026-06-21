// GET /api/admin/smm/report?brandId=&month=6&year=2026
// Returns complete SMM deliverable report for a brand and month

import dbConnect from "@/utils/dbConnect";
import Brand    from "@/models/tasks/Brand";
import Task     from "@/models/tasks/Task";
import Employee from "@/models/hr/Employee";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const MONTH_SHORT  = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const CONTENT_TYPES = ["reel","post","carousel","story"];
const DELIV_KEY    = { reel:"reels", post:"posts", carousel:"carousels", story:"stories" };
const STAGE_NAMES  = ["Script/Concept","Shoot/Design","Edit/Develop","Posted/Live"];

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();

  const { brandId, month, year } = req.query;

  // ── List all active brands (no brandId given) ───────────────────────
  if (!brandId) {
    const brands = await Brand.find({ isActive: true })
      .select("name color logo monthlyDeliverables services")
      .sort({ name: 1 })
      .lean();
    return res.json({ success: true, brands });
  }

  // ── Full brand report ────────────────────────────────────────────────
  const m   = parseInt(month)  || new Date().getMonth() + 1;   // 1-12
  const y   = parseInt(year)   || new Date().getFullYear();

  const brand = await Brand.findById(brandId)
    .select("name color logo monthlyDeliverables weeklySchedule services clientId")
    .lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const monthStr  = MONTH_SHORT[m - 1];            // "jun"
  const yearShort = String(y).slice(2);             // "26"
  const monthTag  = `${monthStr}'${yearShort}`;    // "jun'26"

  const monthStart    = new Date(y, m - 1, 1);
  const nextMonthStart = new Date(y, m, 1);

  // Fetch ALL production tasks for this brand that belong to this month.
  // Primary: match by nomenclature tag (most accurate, covers rollover tasks).
  // Fallback: tasks with no/blank nomenclature created in this calendar month.
  const tasks = await Task.find({
    brandId,
    taskType: "production",
    $or: [
      { nomenclature: { $regex: `${monthTag}$`, $options: "i" } },
      {
        $or: [
          { nomenclature: { $exists: false } },
          { nomenclature: null },
          { nomenclature: "" },
        ],
        createdAt: { $gte: monthStart, $lt: nextMonthStart },
      },
    ],
  })
    .populate("assignedTo", "firstName lastName personal")
    .sort({ contentType: 1, createdAt: 1 })
    .lean();

  // Collect all unique employee IDs referenced in stages (populate doesn't work on sub-array)
  const allStageEmpIds = new Set();
  tasks.forEach(t => {
    (t.stages || []).forEach(s => {
      (s.assignedTo || []).forEach(id => allStageEmpIds.add(String(id)));
    });
  });

  const empDocs = await Employee.find({ _id: { $in: [...allStageEmpIds] } })
    .select("firstName lastName personal")
    .lean();
  const empById = Object.fromEntries(empDocs.map(e => [
    String(e._id),
    `${e.personal?.firstName || e.firstName || ""} ${e.personal?.lastName || e.lastName || ""}`.trim() || "—",
  ]));

  // ── Deliverable summary per content type ────────────────────────────
  const deliverables = {};
  CONTENT_TYPES.forEach(ct => {
    const target  = brand.monthlyDeliverables?.[DELIV_KEY[ct]] || 0;
    const ctTasks = tasks.filter(t => t.contentType === ct);
    const byStatus = (s) => ctTasks.filter(t => t.status === s).length;
    const completed  = byStatus("completed");
    const inProgress = byStatus("in_progress");
    const review     = byStatus("review");
    const blocked    = byStatus("blocked");
    const todo       = byStatus("todo");
    const created    = ctTasks.length;
    const pending    = Math.max(0, target - completed);

    deliverables[ct] = { target, created, completed, inProgress, review, blocked, todo, pending };
  });

  // ── Stage breakdown (index 0=S1, 1=S2, 2=S3, 3=S4) ─────────────────
  const stageStats = {};
  ["S1","S2","S3","S4"].forEach((stageKey, idx) => {
    const stageTasks  = tasks.filter(t => (t.stages || []).length > idx);
    const stageEntries = stageTasks.map(t => ({ task: t, stage: t.stages[idx] }));

    // Count assignees across all tasks for this stage
    const assigneeCount = {};
    stageEntries.forEach(({ stage }) => {
      (stage.assignedTo || []).forEach(id => {
        const sid = String(id);
        const name = empById[sid] || sid;
        assigneeCount[name] = (assigneeCount[name] || 0) + 1;
      });
    });

    stageStats[stageKey] = {
      label:     STAGE_NAMES[idx],
      total:     stageEntries.length,
      done:      stageEntries.filter(({ stage }) => stage.done).length,
      approved:  stageEntries.filter(({ stage }) => stage.approved).length,
      rejected:  stageEntries.filter(({ stage }) => stage.rejected).length,
      assignees: Object.entries(assigneeCount).map(([name, count]) => ({ name, count })),
    };
  });

  // ── Enrich tasks with resolved stage employee names ──────────────────
  const enrichedTasks = tasks.map(t => ({
    ...t,
    stages: (t.stages || []).map(s => ({
      ...s,
      assigneeNames: (s.assignedTo || []).map(id => empById[String(id)] || "—"),
    })),
  }));

  // ── Overall totals ──────────────────────────────────────────────────
  const totalTarget    = CONTENT_TYPES.reduce((s, ct) => s + (deliverables[ct].target || 0), 0);
  const totalCreated   = tasks.length;
  const totalCompleted = tasks.filter(t => t.status === "completed").length;
  const totalPending   = Math.max(0, totalTarget - totalCompleted);

  return res.json({
    success: true,
    brand,
    month: m,
    year:  y,
    monthTag,
    deliverables,
    stageStats,
    tasks: enrichedTasks,
    summary: { totalTarget, totalCreated, totalCompleted, totalPending },
  });
}
