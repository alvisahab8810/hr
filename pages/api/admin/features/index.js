// GET  - list features (project-type tasks) for a sprint or project
// POST - create a feature

import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import "@/models/hr/Employee";

import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const { sprintId, projectId, status } = req.query;
      const q = { taskType: "project" };
      if (sprintId)   q.sprintId   = sprintId;
      if (projectId)  q.projectId  = projectId;
      if (status)     q.status     = status;

      const features = await Task.find(q)
        .populate("assignedTo", "firstName lastName personal professional")
        .populate("statusUpdatedBy", "firstName lastName personal professional")
        .populate("projectId", "name")
        .populate("sprintId", "name")
        .sort(status ? { statusUpdatedAt: -1, createdAt: -1 } : { createdAt: 1 })
        .lean();

      return res.json({ success: true, features });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST ── */
  if (req.method === "POST") {
    try {
      const { title, sprintId, projectId, assignedTo, priority, dueDate } = req.body;
      if (!title?.trim()) return res.status(400).json({ success: false, message: "Feature title is required" });

      const taskId = `F-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

      const feature = await Task.create({
        title:      title.trim(),
        taskType:   "project",
        taskId,
        status:     "todo",
        priority:   priority   || "medium",
        sprintId:   sprintId   || null,
        projectId:  projectId  || null,
        assignedTo: assignedTo || null,
        dueDate:    dueDate    || null,
      });

      const populated = await Task.findById(feature._id)
        .populate("assignedTo", "firstName lastName personal")
        .lean();

      return res.status(201).json({ success: true, feature: populated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
