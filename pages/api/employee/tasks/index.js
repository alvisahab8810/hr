// GET  /api/employee/tasks  — tasks assigned to the logged-in employee
// Digital Marketing employees also auto-receive all production S4 tasks.
// For STORY content type: tasks are auto-generated from brand.weeklySchedule
// (no manager creation needed — they appear directly at S4 on scheduled days).
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import Brand from "@/models/tasks/Brand";
import Employee from "@/models/hr/Employee";
import "@/models/AdminUser";
import "@/models/projects/Project";
import "@/models/projects/Sprint";

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

const POPULATE = [
  { path: "brandId",    select: "name color slug" },
  { path: "assignedBy", select: "firstName lastName" },
  { path: "projectId",  select: "name endDate brandId", populate: { path: "brandId", select: "name color" } },
  { path: "sprintId",   select: "name endDate" },
];

const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STAGE_NAMES = ["Script/Concept","Shoot/Design","Edit/Develop","Posted/Live"];

const CONTENT_TYPES = ["reel", "post", "carousel", "story"];
const DELIV_KEY     = { reel: "reels", post: "posts", carousel: "carousels", story: "stories" };
const CT_LABEL      = { reel: "Reel", post: "Post", carousel: "Carousel", story: "Story" };

// Auto-create production tasks at S4 for ALL content types for the current month,
// based on each brand's weeklySchedule + monthlyDeliverables.
// Idempotent — safe to call on every DM employee request.
// Tasks go directly to S4 (Posted/Live) — no dependency on other employees' stages.
async function autoGenerateProductionTasks() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth();

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const monthStr   = MONTH_SHORT[month];
  const yearStr    = String(year).slice(2);

  const brands = await Brand.find({ isActive: true, "weeklySchedule.0": { $exists: true } })
    .select("name weeklySchedule monthlyDeliverables").lean();

  for (const brand of brands) {
    const brandPrefix = (brand.name || "XX").replace(/\s+/g, "").slice(0, 2).toUpperCase();

    for (const ct of CONTENT_TYPES) {
      const target = brand.monthlyDeliverables?.[DELIV_KEY[ct]] || 0;
      if (target === 0) continue;

      const postingDays = [...new Set(
        (brand.weeklySchedule || []).filter(s => s.contentType === ct).map(s => s.day)
      )];
      if (postingDays.length === 0) continue;

      // Build all potential posting dates in this month at 6 PM IST (12:30 UTC)
      const allDates = [];
      const cursor = new Date(Date.UTC(year, month, 1));
      while (cursor.getUTCMonth() === month) {
        if (postingDays.includes(DAY_NAMES[cursor.getUTCDay()])) {
          allDates.push(new Date(Date.UTC(year, month, cursor.getUTCDate(), 12, 30, 0)));
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      if (allDates.length === 0) continue;

      // Slice to monthly target
      const postingDates = allDates.slice(0, target);
      const cutoffDate   = postingDates[postingDates.length - 1];

      // Find all existing tasks for this brand + contentType this month
      const existing = await Task.find({
        brandId:     brand._id,
        taskType:    "production",
        contentType: ct,
        dueDate:     { $gte: monthStart, $lte: monthEnd },
      }).select("dueDate _id status stages").lean();

      // Remove auto-generated extras beyond target (only unsubmitted/unapproved)
      const extras = existing.filter(t => {
        const d = new Date(t.dueDate);
        return d > cutoffDate
          && t.status === "todo"
          && !(t.stages || []).some(s => s.done || s.approved);
      });
      if (extras.length > 0) {
        await Task.deleteMany({ _id: { $in: extras.map(t => t._id) } });
      }

      // Date keys already occupied (by manager-created OR existing auto tasks)
      const existingDateKeys = new Set(
        existing
          .filter(t => new Date(t.dueDate) <= cutoffDate)
          .map(t => new Date(t.dueDate).toISOString().slice(0, 10))
      );

      // Also check by nomenclature to avoid collisions with manager-created tasks
      // that might have a different stored dueDate (legacy bug)
      const existingNomencs = new Set(
        (await Task.find(
          { brandId: brand._id, contentType: ct, nomenclature: { $regex: `^${ct}\\d+ ${monthStr}'${yearStr}$` } },
          { nomenclature: 1, _id: 0 }
        ).lean()).map(t => t.nomenclature)
      );

      for (let i = 0; i < postingDates.length; i++) {
        const postDate    = postingDates[i];
        const dateKey     = postDate.toISOString().slice(0, 10);
        const serial      = i + 1;
        const nomenclature = `${ct}${serial} ${monthStr}'${yearStr}`;

        if (existingNomencs.has(nomenclature)) {
          // Task exists but S4 deadline may be wrong (ser=1 bug set all tasks to the 1st posting date).
          // Patch any task where S4 hasn't been posted/approved yet and deadline doesn't match.
          await Task.updateMany(
            {
              brandId:          brand._id,
              contentType:      ct,
              nomenclature,
              "stages.3.done":     { $ne: true },
              "stages.3.approved": { $ne: true },
              "stages.3.deadline": { $ne: postDate },
            },
            { $set: { "stages.3.deadline": postDate, dueDate: postDate } }
          );
          continue;
        }
        if (existingDateKeys.has(dateKey)) continue;

        // Generate unique brand taskId
        const lastTask = await Task.findOne(
          { taskId: { $regex: `^${brandPrefix}\\d+` } },
          { taskId: 1 }
        ).sort({ taskId: -1 }).lean();
        const lastSerial = lastTask?.taskId
          ? parseInt(lastTask.taskId.slice(brandPrefix.length), 10) || 0
          : 0;
        const taskId = `${brandPrefix}${String(lastSerial + 1).padStart(3, "0")}`;

        const stagesArr = STAGE_NAMES.map((name, idx) => ({
          name,
          assignedTo: [],
          deadline:   idx === 3 ? postDate : null,
          done:       false,
        }));

        try {
          await Task.create({
            taskId,
            title:       `${CT_LABEL[ct]} · ${brand.name}`,
            taskType:    "production",
            contentType: ct,
            brandId:     brand._id,
            stage:       "S4",
            status:      "todo",
            dueDate:     postDate,
            nomenclature,
            stages:      stagesArr,
          });
        } catch (e) {
          if (e.code !== 11000) throw e; // 11000 = duplicate key, safe to skip
        }
      }
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  try {
    const { status, stage, contentType, taskType } = req.query;

    const empId = mongoose.Types.ObjectId.isValid(payload.id)
      ? new mongoose.Types.ObjectId(payload.id)
      : payload.id;

    // Check if this employee is in Digital Marketing department
    const empDoc = await Employee.findById(empId).select("professional").lean();
    const dept   = (empDoc?.professional?.department || "").toLowerCase();
    const isDM   = dept.includes("digital marketing") || dept.includes("digital") || dept.includes("marketing");

    // Auto-generate story tasks for DM employees before fetching
    if (isDM) {
      await autoGenerateProductionTasks();
    }

    // Primary query: tasks explicitly assigned to this employee
    const q = {
      $or: [
        { assignedTo: empId },
        { "stages.assignedTo": empId },
      ],
    };
    if (status)      q.status      = status;
    if (stage)       q.stage       = stage;
    if (contentType) q.contentType = contentType;
    if (taskType)    q.taskType    = taskType;

    const regularTasks = await Task.find(q)
      .populate(POPULATE)
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    let tasks = regularTasks;

    // DM employees see ALL production tasks they still need to post.
    // We filter on S4 stage directly — not on task.status — because admins sometimes
    // mark tasks "completed" at the production level before Anurag has actually posted.
    if (isDM) {
      const dmQ = {
        taskType: "production",
        // Include if S4 not yet posted, OR posted but still awaiting admin approval.
        // Exclude only tasks where Anurag's S4 is fully approved (truly done).
        $or: [
          { "stages.3.done":     { $ne: true } },
          { "stages.3.approved": { $ne: true } },
        ],
        _id: { $nin: regularTasks.map(t => t._id) },
      };
      if (contentType) dmQ.contentType = contentType;

      const dmTasks = await Task.find(dmQ)
        .populate(POPULATE)
        .sort({ dueDate: 1, createdAt: -1 })
        .lean();

      tasks = [...regularTasks, ...dmTasks].sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate) : new Date(8640000000000000);
        const db = b.dueDate ? new Date(b.dueDate) : new Date(8640000000000000);
        return da - db;
      });
    }

    return res.json({ success: true, tasks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
