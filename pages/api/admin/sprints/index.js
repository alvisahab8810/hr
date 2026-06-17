// GET  - list sprints (filter by projectId)
// POST - create a sprint

import dbConnect from "@/utils/dbConnect";
import Sprint from "@/models/projects/Sprint";
import Task   from "@/models/tasks/Task";

import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const { projectId, status, phase } = req.query;
      const q = {};

      if (projectId) q.projectId = projectId;
      if (status)    q.status    = status;
      if (phase)     q.phase     = phase;

      const sprints = await Sprint.find(q)
        .populate("projectId", "name status")
        .sort({ createdAt: -1 })
        .lean();

      // Dynamic completion progress per sprint (count of "project"-type tasks/features)
      const counts = await Task.aggregate([
        { $match: { taskType: "project", sprintId: { $in: sprints.map(s => s._id) } } },
        { $group: { _id: { sprintId: "$sprintId", done: { $eq: ["$status", "completed"] } }, count: { $sum: 1 } } },
      ]);
      const progressMap = {};
      counts.forEach(c => {
        const sid = c._id.sprintId?.toString();
        if (!sid) return;
        if (!progressMap[sid]) progressMap[sid] = { total: 0, done: 0 };
        progressMap[sid].total += c.count;
        if (c._id.done) progressMap[sid].done += c.count;
      });
      const sprintsWithProgress = sprints.map(s => ({
        ...s,
        progress: progressMap[s._id.toString()] || { total: 0, done: 0 },
      }));

      return res.json({ success: true, sprints: sprintsWithProgress });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST ── */
  if (req.method === "POST") {
    try {
      const {
        name,
        goal,
        projectId,
        status,
        phase,
        durationDays,
        startDate,
        endDate,
        createdById,
        createdByModel = "AdminUser",
      } = req.body;

      if (!name?.trim())  return res.status(400).json({ success: false, message: "Sprint name is required" });
      if (!projectId)     return res.status(400).json({ success: false, message: "projectId is required" });

      const sprint = await Sprint.create({
        name:          name.trim(),
        goal:          goal          || "",
        projectId,
        status:        status        || "planned",
        phase:         phase         || "development",
        durationDays:  durationDays  || null,
        startDate:     startDate     || null,
        endDate:       endDate       || null,
        createdBy:     createdById   || null,
        createdByModel,
      });

      const populated = await Sprint.findById(sprint._id)
        .populate("projectId", "name status")
        .lean();

      return res.status(201).json({ success: true, sprint: populated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
