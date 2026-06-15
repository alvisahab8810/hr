// GET  - list all tasks (filters, search, pagination)
// POST - create a new task

import dbConnect from "@/utils/dbConnect";
import Task     from "@/models/tasks/Task";
import Brand    from "@/models/tasks/Brand";
import Employee from "@/models/hr/Employee";
import Project  from "@/models/projects/Project";
import Sprint   from "@/models/projects/Sprint";
import Client   from "@/models/clients/Client";
import { logActivity }           from "@/utils/tasks/logActivity";
import { sendNotification }     from "@/utils/tasks/sendNotification";
import { sendTaskAssignedEmail } from "@/utils/email/sendTaskEmail";
import { logAdminActivity }     from "@/utils/tasks/logAdminActivity";
import { adminGuard }           from "@/utils/admin/adminAuthGuard";
import { emitTaskEvent }        from "@/utils/tasks/emitTaskEvent";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  /* ── GET: list with filters, search, pagination ── */
  if (req.method === "GET") {
    try {
      const {
        status,
        priority,
        taskType,
        assignedTo,
        projectId,
        sprintId,
        clientId,
        brandId,
        stage,
        contentType,
        search,
        overdue,
        hideCompleted,
        dateStart,
        dateEnd,
        sortBy = "createdAt",
        sortOrder = "desc",
        page = 1,
        limit = 20,
      } = req.query;

      const q = {};

      if (priority)    q.priority    = priority;
      if (projectId)   q.projectId   = projectId;
      if (sprintId)    q.sprintId    = sprintId;
      if (clientId)    q.clientId    = clientId;
      if (brandId)     q.brandId     = brandId;
      if (stage)       q.stage       = stage;
      if (contentType) q.contentType = contentType;
      if (req.query.seoCategory) q.seoCategory = req.query.seoCategory;
      if (req.query.tags) q.tags = { $in: Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags] };
      if (taskType && taskType !== "general") q.taskType = taskType;

      // Collect multi-field OR conditions into $and so they don't overwrite each other
      const andClauses = [];

      // General tab: match taskType:"general" OR manual tasks not tagged for other tabs (old general tasks had no tags)
      if (taskType === "general") {
        andClauses.push({ $or: [
          { taskType: "general" },
          { taskType: "manual", tags: { $in: ["general"] } },
          // Old general tasks: taskType:"manual", no seoCategory, no tab-specific tags
          {
            taskType: "manual",
            seoCategory: { $in: ["", null] },
            tags: { $not: { $elemMatch: { $in: ["seo","ads","branding","sprint","feature","page","website","web"] } } },
          },
        ]});
      }

      // Status filter — "review" and "blocked" also check stage-level state,
      // because task.status may still be "in_progress" even when a stage is pending
      // review or rejected (the employee submit flow doesn't always update task.status).
      if (status === "review") {
        // Match tasks in review status OR tasks where any stage is submitted but not yet approved/rejected
        andClauses.push({ $or: [
          { status: "review" },
          {
            status: { $nin: ["completed"] },
            stages: { $elemMatch: { done: true, approved: { $ne: true }, rejected: { $ne: true } } },
          },
        ]});
      } else if (status === "blocked") {
        // Match tasks in blocked status OR tasks where any stage was rejected
        andClauses.push({ $or: [
          { status: "blocked" },
          {
            status: { $nin: ["completed"] },
            stages: { $elemMatch: { rejected: true } },
          },
        ]});
      } else if (status) {
        q.status = status;
      } else if (hideCompleted === "true") {
        q.status = { $nin: ["completed"] };
      }

      if (overdue === "true") {
        q.dueDate = { $lt: new Date() };
        if (!q.status) q.status = { $nin: ["completed"] };
      }

      // Assignee: match top-level assignedTo OR any stage's assignedTo (for production tasks)
      if (assignedTo) {
        andClauses.push({ $or: [
          { assignedTo: assignedTo },
          { "stages.assignedTo": assignedTo },
        ]});
      }

      // Date range: match any date field
      if (dateStart || dateEnd) {
        const range = {};
        if (dateStart) range.$gte = new Date(dateStart);
        if (dateEnd)   range.$lte = new Date(dateEnd);
        andClauses.push({ $or: [
          { scheduledFor: range },
          { dueDate: range },
          { "stages.deadline": range },
          { "stages.doneAt": range },
          { submittedAt: range },
          { updatedAt: range },
          { createdAt: range },
        ]});
      }

      // Search: title, description, nomenclature, and task ID
      if (search) {
        andClauses.push({ $or: [
          { title:        { $regex: search, $options: "i" } },
          { description:  { $regex: search, $options: "i" } },
          { nomenclature: { $regex: search, $options: "i" } },
          { taskId:       { $regex: search, $options: "i" } },
        ]});
      }

      if (andClauses.length === 1) {
        q.$or = andClauses[0].$or;
      } else if (andClauses.length > 1) {
        q.$and = andClauses;
      }

      const skip  = (Number(page) - 1) * Number(limit);
      const total = await Task.countDocuments(q);

      const ALLOWED_SORT = ["createdAt", "updatedAt", "dueDate", "priority", "title"];
      const sortField = ALLOWED_SORT.includes(sortBy) ? sortBy : "createdAt";
      const sortDir   = sortOrder === "asc" ? 1 : -1;

      const tasks = await Task.find(q)
        .populate("assignedTo", "firstName lastName personal professional")
        .populate("projectId",  "name status")
        .populate("sprintId",   "name status")
        .populate("clientId",   "name company")
        .populate("brandId",    "name color")
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(Number(limit))
        .lean();

      return res.json({
        success: true,
        tasks,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST: create ── */
  if (req.method === "POST") {
    try {
      const {
        title,
        description,
        taskType,
        priority,
        assignedTo,
        assignedById,
        assignedByModel = "AdminUser",
        assignedByName,
        projectId,
        sprintId,
        clientId,
        dueDate,
        scheduledFor,
        tags,
        estimatedHours,
        brandId,
        contentType,
        stage,
        stages,
        seoCategory,
      } = req.body;

      if (!taskType) return res.status(400).json({ success: false, message: "taskType is required" });

      /* ── Generate brand-wise serial task ID (e.g. CO001, TO002) ── */
      let taskId = "";
      if (brandId) {
        const brand = await Brand.findById(brandId).select("name").lean();
        const prefix = (brand?.name || "XX").replace(/\s+/g, "").slice(0, 2).toUpperCase();
        const brandCount = await Task.countDocuments({ brandId });
        taskId = `${prefix}${String(brandCount + 1).padStart(3, "0")}`;
      } else {
        const totalCount = await Task.countDocuments({ brandId: null });
        taskId = `T${String(totalCount + 1).padStart(4, "0")}`;
      }

      /* ── Auto-generate nomenclature for production tasks ── */
      let nomenclature = "";
      if (taskType === "production" && brandId && contentType) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const count = await Task.countDocuments({
          brandId,
          contentType,
          createdAt: { $gte: monthStart, $lte: monthEnd },
        });
        const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
        const monthStr = MONTH_SHORT[now.getMonth()];
        const yearStr  = String(now.getFullYear()).slice(2);
        nomenclature = `${contentType}${count + 1} ${monthStr}'${yearStr}`;
      }

      /* ── Derive title for production tasks ── */
      const finalTitle = title?.trim() || nomenclature;
      if (!finalTitle) return res.status(400).json({ success: false, message: "Title is required" });

      /* ── For production tasks, derive primary assignee & dueDate from stages ── */
      const stagesArr = Array.isArray(stages) ? stages : [];
      const firstStageAssignees = stagesArr[0]?.assignedTo;
      const primaryAssignee = assignedTo || (Array.isArray(firstStageAssignees) ? firstStageAssignees[0] : firstStageAssignees) || null;
      const primaryDueDate  = dueDate || stagesArr[stagesArr.length - 1]?.deadline || null;

      const task = await Task.create({
        title:         finalTitle,
        description:   description   || "",
        taskType,
        priority:      priority      || "medium",
        assignedTo:    primaryAssignee || null,
        assignedBy:    assignedById  || null,
        assignedByModel,
        projectId:     projectId     || null,
        sprintId:      sprintId      || null,
        clientId:      clientId      || null,
        dueDate:       primaryDueDate || null,
        scheduledFor:  scheduledFor  || null,
        tags:          tags          || [],
        estimatedHours: estimatedHours || null,
        brandId:       brandId       || null,
        contentType:   contentType   || "",
        seoCategory:   seoCategory   || "",
        stage:         stage         || (taskType === "production" ? "S1" : ""),
        nomenclature,
        taskId,
        stages:        stagesArr.map(s => ({
          name:       s.name     || "",
          assignedTo: Array.isArray(s.assignedTo) ? s.assignedTo.filter(Boolean) : (s.assignedTo ? [s.assignedTo] : []),
          deadline:   s.deadline || null,
        })),
      });

      // Activity log
      await logActivity({
        taskId:          task._id,
        action:          "created",
        remark:          `Task created: "${task.title}"`,
        performedById:   assignedById,
        performedByModel: assignedByModel,
        performedByName: assignedByName || "Admin",
      });

      // Track manager activity
      if (assignedByModel === "AdminUser" && assignedById) {
        logAdminActivity({
          adminUserId:   assignedById,
          adminUserName: assignedByName || "Manager",
          action:        "task_created",
          category:      "task",
          description:   `Created task "${task.title}"`,
          metadata:      { taskId: task._id, taskTitle: task.title, employeeId: primaryAssignee },
        }).catch(() => {});
      }

      // Notify assignee (in-app + email)
      if (primaryAssignee) {
        await sendNotification({
          recipientId:    primaryAssignee,
          recipientModel: "Employee",
          type:           "task_assigned",
          message:        `You have been assigned a new task: "${task.title}"`,
          taskId:         task._id,
        });
      }

      const populated = await Task.findById(task._id)
        .populate("assignedTo", "firstName lastName personal professional")
        .populate("projectId",  "name status")
        .populate("sprintId",   "name status")
        .populate("clientId",   "name company")
        .populate("brandId",    "name color")
        .lean();

      // Send assignment email — fire-and-forget (don't block response)
      if (populated?.assignedTo) {
        const emp = populated.assignedTo;
        const empEmail = emp.professional?.officialEmail || emp.personal?.email || "";
        const empName  = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Team Member";

        // Enrich admin activity log with employee name
        if (assignedByModel === "AdminUser" && assignedById && empName) {
          logAdminActivity({
            adminUserId:   assignedById,
            adminUserName: assignedByName || "Manager",
            action:        "task_assigned",
            category:      "task",
            description:   `Assigned task "${task.title}" to ${empName}`,
            metadata:      { taskId: task._id, taskTitle: task.title, employeeId: emp._id, employeeName: empName },
          }).catch(() => {});
        }
        if (empEmail) {
          sendTaskAssignedEmail({
            employeeEmail: empEmail,
            employeeName:  empName,
            task:          populated,
            assignerName:  assignedByName || "Admin Team",
            brandName:     populated.brandId?.name  || "",
            clientName:    populated.clientId?.name || "",
          }).catch(e => console.error("[task-email] failed:", e.message));
        }
      }

      // Also email stage assignees (production tasks with multiple stages)
      if (stagesArr.length > 0) {
        const allStageIds = [...new Set(
          stagesArr.flatMap(s =>
            Array.isArray(s.assignedTo) ? s.assignedTo.filter(Boolean) : (s.assignedTo ? [String(s.assignedTo)] : [])
          ).map(String).filter(id => id !== String(primaryAssignee))
        )];
        if (allStageIds.length > 0) {
          Employee.find({ _id: { $in: allStageIds } })
            .select("personal professional firstName lastName")
            .lean()
            .then(emps => {
              emps.forEach(emp => {
                const email = emp.professional?.officialEmail || emp.personal?.email || "";
                const name  = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim();
                if (email) {
                  sendTaskAssignedEmail({
                    employeeEmail: email,
                    employeeName:  name || "Team Member",
                    task:          populated,
                    assignerName:  assignedByName || "Admin Team",
                    brandName:     populated.brandId?.name  || "",
                    clientName:    populated.clientId?.name || "",
                  }).catch(e => console.error("[task-email-stage] failed:", e.message));
                }
              });
            })
            .catch(e => console.error("[task-email-stages] fetch failed:", e.message));
        }
      }

      // Notify all connected clients about the new task
      const stageEmpIds = stagesArr.flatMap(s => Array.isArray(s.assignedTo) ? s.assignedTo.map(String) : (s.assignedTo ? [String(s.assignedTo)] : []));
      emitTaskEvent("task:created", { taskId: String(task._id), employeeIds: [...new Set([String(primaryAssignee || ""), ...stageEmpIds].filter(Boolean))] });

      return res.status(201).json({ success: true, task: populated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
