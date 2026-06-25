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

// Auto-create story tasks for the current month for all brands that have
// story entries in their weeklySchedule. Idempotent — safe to call on every request.
async function autoGenerateStoryTasks() {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd   = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
  const monthStr   = MONTH_SHORT[month];
  const yearStr    = String(year).slice(2);

  // All active brands that have at least one story slot in their schedule
  const brands = await Brand.find({
    isActive: true,
    "weeklySchedule.contentType": "story",
  }).select("name weeklySchedule monthlyDeliverables").lean();

  for (const brand of brands) {
    // Target: how many stories this brand posts per month
    const storyTarget = brand.monthlyDeliverables?.stories || 0;
    if (storyTarget === 0) continue;

    const storyDays = [...new Set(
      (brand.weeklySchedule || [])
        .filter(s => s.contentType === "story")
        .map(s => s.day)
    )];
    if (storyDays.length === 0) continue;

    // All potential story posting dates in this month at 6 PM IST (12:30 UTC)
    const allDates = [];
    const cursor = new Date(Date.UTC(year, month, 1));
    while (cursor.getUTCMonth() === month) {
      if (storyDays.includes(DAY_NAMES[cursor.getUTCDay()])) {
        allDates.push(new Date(Date.UTC(year, month, cursor.getUTCDate(), 12, 30, 0)));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    if (allDates.length === 0) continue;

    // Limit to exactly monthlyDeliverables.stories posting dates
    const postingDates  = allDates.slice(0, storyTarget);
    const cutoffDate    = postingDates[postingDates.length - 1]; // last valid date

    // Find all existing story tasks for this brand this month
    const existing = await Task.find({
      brandId:     brand._id,
      taskType:    "production",
      contentType: "story",
      dueDate:     { $gte: monthStart, $lte: monthEnd },
    }).select("dueDate _id status stages").lean();

    // Remove extras beyond the target count (only if unsubmitted/unapproved)
    const extras = existing.filter(t => {
      const d = new Date(t.dueDate);
      return d > cutoffDate
        && t.status === "todo"
        && !(t.stages || []).some(s => s.done || s.approved);
    });
    if (extras.length > 0) {
      await Task.deleteMany({ _id: { $in: extras.map(t => t._id) } });
    }

    // Date keys of valid existing tasks
    const existingDateKeys = new Set(
      existing
        .filter(t => new Date(t.dueDate) <= cutoffDate)
        .map(t => new Date(t.dueDate).toISOString().slice(0, 10))
    );

    const brandPrefix = (brand.name || "XX").replace(/\s+/g, "").slice(0, 2).toUpperCase();

    for (let i = 0; i < postingDates.length; i++) {
      const postDate = postingDates[i];
      const dateKey  = postDate.toISOString().slice(0, 10);
      if (existingDateKeys.has(dateKey)) continue;

      const serial       = i + 1;
      const nomenclature = `story${serial} ${monthStr}'${yearStr}`;

      // Generate unique taskId
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
          title:       `Story · ${brand.name}`,
          taskType:    "production",
          contentType: "story",
          brandId:     brand._id,
          stage:       "S4",
          status:      "todo",
          dueDate:     postDate,
          nomenclature,
          stages:      stagesArr,
        });
      } catch (e) {
        if (e.code !== 11000) throw e;
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
      await autoGenerateStoryTasks();
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

    // DM employees also auto-see ALL production S4 tasks (all content types)
    // and auto-generated story tasks (contentType: "story", stage: "S4")
    if (isDM) {
      const s4Q = {
        taskType: "production",
        stage:    "S4",
        status:   { $nin: ["completed"] },
        _id:      { $nin: regularTasks.map(t => t._id) },
      };
      if (status)      s4Q.status      = status;
      if (contentType) s4Q.contentType = contentType;

      const s4Tasks = await Task.find(s4Q)
        .populate(POPULATE)
        .sort({ dueDate: 1, createdAt: -1 })
        .lean();

      tasks = [...regularTasks, ...s4Tasks].sort((a, b) => {
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
