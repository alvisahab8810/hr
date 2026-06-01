// GET    - single task detail with comments + activity log
// PATCH  - update task fields
// DELETE - delete task

import dbConnect from "@/utils/dbConnect";
import Task     from "@/models/tasks/Task";
import Brand    from "@/models/tasks/Brand";
import Employee from "@/models/hr/Employee";
import Project  from "@/models/projects/Project";
import Sprint   from "@/models/projects/Sprint";
import Client   from "@/models/clients/Client";
import TaskComment  from "@/models/tasks/TaskComment";
import TaskActivity from "@/models/tasks/TaskActivity";
import { logActivity }           from "@/utils/tasks/logActivity";
import { sendNotification }     from "@/utils/tasks/sendNotification";
import { sendTaskAssignedEmail, sendStageApprovedEmail, sendStageRejectedEmail } from "@/utils/email/sendTaskEmail";
import { gradeTask, pointsToGrade } from "@/utils/tasks/gradeTask";
import { logAdminActivity }     from "@/utils/tasks/logAdminActivity";
import { adminGuard }           from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const task = await Task.findById(id)
        .populate("assignedTo", "firstName lastName personal professional")
        .populate("assignedBy", "name firstName lastName")
        .populate("projectId",  "name status")
        .populate("sprintId",   "name status")
        .populate("clientId",   "name company")
        .populate("brandId",    "name color")
        .lean();

      if (!task) return res.status(404).json({ success: false, message: "Task not found" });

      const [comments, activity] = await Promise.all([
        TaskComment.find({ taskId: id }).sort({ createdAt: 1 }).lean(),
        TaskActivity.find({ taskId: id }).sort({ createdAt: 1 }).lean(),
      ]);

      return res.json({ success: true, task, comments, activity });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── PATCH ── */
  if (req.method === "PATCH") {
    try {
      const existing = await Task.findById(id).lean();
      if (!existing) return res.status(404).json({ success: false, message: "Task not found" });

      const {
        performedById,
        performedByModel = "AdminUser",
        performedByName  = "Admin",
        ...updates
      } = req.body;

      // Track meaningful changes for activity log
      const changes = [];

      if (updates.status && updates.status !== existing.status) {
        changes.push({ action: "status_changed", from: existing.status, to: updates.status });
      }
      if (updates.priority && updates.priority !== existing.priority) {
        changes.push({ action: "priority_changed", from: existing.priority, to: updates.priority });
      }
      if (updates.assignedTo && String(updates.assignedTo) !== String(existing.assignedTo)) {
        changes.push({ action: "reassigned", from: String(existing.assignedTo), to: String(updates.assignedTo) });
      }
      if (updates.dueDate && String(updates.dueDate) !== String(existing.dueDate)) {
        changes.push({ action: "due_date_changed", from: existing.dueDate, to: updates.dueDate });
      }
      if (updates.title && updates.title !== existing.title) {
        changes.push({ action: "title_changed", from: existing.title, to: updates.title });
      }

      const task = await Task.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      )
        .populate("assignedTo", "firstName lastName personal professional")
        .populate("projectId",  "name status")
        .populate("sprintId",   "name status")
        .populate("clientId",   "name company")
        .lean();

      // Log each detected change
      for (const change of changes) {
        await logActivity({
          taskId:          id,
          action:          change.action,
          from:            change.from ? String(change.from) : null,
          to:              change.to   ? String(change.to)   : null,
          performedById,
          performedByModel,
          performedByName,
        });
      }

      // Track manager activity
      if (performedByModel === "AdminUser" && performedById && changes.length > 0) {
        const ACTION_LABELS = {
          status_changed:    (c) => `Changed status of "${task.title}" from "${c.from}" to "${c.to}"`,
          priority_changed:  (c) => `Changed priority of "${task.title}" from "${c.from}" to "${c.to}"`,
          reassigned:        (c) => `Reassigned task "${task.title}"`,
          due_date_changed:  (c) => `Updated due date of "${task.title}"`,
          title_changed:     (c) => `Renamed task from "${c.from}" to "${c.to}"`,
        };
        for (const change of changes) {
          const desc = ACTION_LABELS[change.action]?.(change) || `Updated task "${task.title}"`;
          logAdminActivity({
            adminUserId:   performedById,
            adminUserName: performedByName || "Manager",
            action:        change.action,
            category:      "task",
            description:   desc,
            metadata: {
              taskId:    id,
              taskTitle: task.title,
              fromValue: change.from ? String(change.from) : "",
              toValue:   change.to   ? String(change.to)   : "",
            },
          }).catch(() => {});
        }
      }

      // Notify new assignee on reassignment (in-app + email)
      const reassign = changes.find((c) => c.action === "reassigned");
      if (reassign && updates.assignedTo) {
        await sendNotification({
          recipientId:    updates.assignedTo,
          recipientModel: "Employee",
          type:           "task_reassigned",
          message:        `Task "${task.title}" has been assigned to you.`,
          taskId:         id,
        });

        const emp = task.assignedTo;
        if (emp) {
          const empEmail = emp.professional?.officialEmail || emp.personal?.email || "";
          const empName  = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Team Member";
          if (empEmail) {
            sendTaskAssignedEmail({
              employeeEmail: empEmail,
              employeeName:  empName,
              task,
              assignerName:  performedByName || "Admin Team",
              brandName:     task.brandId?.name  || "",
              clientName:    task.clientId?.name || "",
            }).catch(e => console.error("[reassign-email] failed:", e.message));
          }
        }
      }

      // Notify on status change if assignee exists
      const statusChange = changes.find((c) => c.action === "status_changed");
      if (statusChange && task.assignedTo && String(task.assignedTo._id) !== String(performedById)) {
        await sendNotification({
          recipientId:    task.assignedTo._id,
          recipientModel: "Employee",
          type:           "task_status_changed",
          message:        `Task "${task.title}" status changed to ${updates.status}.`,
          taskId:         id,
        });
      }

      // ── Stage change emails (approve / reject / new assignee) ──────────
      const STAGE_NAMES_LIST = ["Script/Concept", "Shoot/Design", "Edit/Develop", "Posted/Live"];

      if (Array.isArray(updates.stages)) {
        const existingStages = existing.stages || [];

        // Collect all stage-assignee IDs that need emails
        const approvalEmailJobs = [];
        const rejectionEmailJobs = [];
        const newAssigneeIds = new Set();

        updates.stages.forEach((newStg, i) => {
          const oldStg = existingStages[i] || {};
          const stageName  = newStg.name || STAGE_NAMES_LIST[i] || `Stage ${i + 1}`;
          const assigneeIds = Array.isArray(newStg.assignedTo) ? newStg.assignedTo.map(String) : [];
          const oldAssigneeIds = Array.isArray(oldStg.assignedTo) ? oldStg.assignedTo.map(String) : [];

          // Stage approved
          if (newStg.approved && !oldStg.approved) {
            const stgGradeData = gradeTask({ dueDate: newStg.deadline, status: "completed", submittedAt: newStg.doneAt, updatedAt: newStg.doneAt });
            const grade = stgGradeData ? { ...pointsToGrade(stgGradeData.points), hoursLate: stgGradeData.hoursLate } : null;
            assigneeIds.forEach(empId => approvalEmailJobs.push({ empId, stageIndex: i, stageName, deadline: newStg.deadline, grade }));
          }

          // Stage rejected
          if (newStg.rejected && !oldStg.rejected) {
            assigneeIds.forEach(empId => rejectionEmailJobs.push({ empId, stageIndex: i, stageName, deadline: newStg.deadline, rejectReason: newStg.rejectReason || "" }));
          }

          // Newly added stage assignees → send assignment email
          assigneeIds.forEach(empId => {
            if (!oldAssigneeIds.includes(empId)) newAssigneeIds.add(JSON.stringify({ empId, stageIndex: i, stageName, deadline: newStg.deadline }));
          });
        });

        // Resolve all employee IDs needed
        const allIds = [
          ...approvalEmailJobs.map(j => j.empId),
          ...rejectionEmailJobs.map(j => j.empId),
          ...[...newAssigneeIds].map(s => JSON.parse(s).empId),
        ].filter(Boolean);

        if (allIds.length > 0) {
          Employee.find({ _id: { $in: [...new Set(allIds)] } })
            .select("personal professional firstName lastName")
            .lean()
            .then(emps => {
              const byId = Object.fromEntries(emps.map(e => [String(e._id), e]));

              // Approval emails
              approvalEmailJobs.forEach(({ empId, stageIndex, stageName, deadline, grade }) => {
                const emp = byId[empId];
                if (!emp) return;
                const empEmail = emp.professional?.officialEmail || emp.personal?.email || "";
                const empName  = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Team Member";
                if (!empEmail) return;
                sendStageApprovedEmail({ employeeEmail: empEmail, employeeName: empName, task, stageName, stageIndex, stageDeadline: deadline, grade })
                  .catch(e => console.error("[stage-approve-email] failed:", e.message));
              });

              // Rejection emails
              rejectionEmailJobs.forEach(({ empId, stageIndex, stageName, deadline, rejectReason }) => {
                const emp = byId[empId];
                if (!emp) return;
                const empEmail = emp.professional?.officialEmail || emp.personal?.email || "";
                const empName  = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Team Member";
                if (!empEmail) return;
                sendStageRejectedEmail({ employeeEmail: empEmail, employeeName: empName, task, stageName, stageIndex, stageDeadline: deadline, rejectReason })
                  .catch(e => console.error("[stage-reject-email] failed:", e.message));
              });

              // New stage assignee emails
              newAssigneeIds.forEach(raw => {
                const { empId, stageIndex, stageName, deadline } = JSON.parse(raw);
                const emp = byId[empId];
                if (!emp) return;
                const empEmail = emp.professional?.officialEmail || emp.personal?.email || "";
                const empName  = `${emp.personal?.firstName || emp.firstName || ""} ${emp.personal?.lastName || emp.lastName || ""}`.trim() || "Team Member";
                if (!empEmail) return;
                sendTaskAssignedEmail({
                  employeeEmail: empEmail, employeeName: empName, task,
                  assignerName: performedByName || "Admin Team",
                  brandName: task.brandId?.name || "", clientName: task.clientId?.name || "",
                  stageName, stageDeadline: deadline,
                }).catch(e => console.error("[stage-assign-email] failed:", e.message));
              });
            })
            .catch(e => console.error("[stage-emails] emp fetch failed:", e.message));
        }
      }

      return res.json({ success: true, task });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── DELETE ── */
  if (req.method === "DELETE") {
    try {
      await Task.findByIdAndDelete(id);
      await TaskComment.deleteMany({ taskId: id });
      await TaskActivity.deleteMany({ taskId: id });
      return res.json({ success: true, message: "Task deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
