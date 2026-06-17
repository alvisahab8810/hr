// GET  - list all projects (with optional filters)
// POST - create a new project

import dbConnect from "@/utils/dbConnect";
import Project from "@/models/projects/Project";
import Task    from "@/models/tasks/Task";
import "@/models/clients/Client";
import "@/models/hr/Employee";
import "@/models/tasks/Brand";

import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const { status, clientId, search } = req.query;
      const q = {};

      if (status)   q.status   = status;
      if (clientId) q.clientId = clientId;
      if (search) {
        q.$or = [
          { name:        { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      const projects = await Project.find(q)
        .populate("clientId", "name company email")
        .populate("brandId",  "name color")
        .populate("members",  "firstName lastName personal professional")
        .populate("phaseTeams.members", "firstName lastName personal")
        .sort({ createdAt: -1 })
        .lean();

      // Dynamic completion progress per project (count of "project"-type tasks/features)
      const counts = await Task.aggregate([
        { $match: { taskType: "project", projectId: { $in: projects.map(p => p._id) } } },
        { $group: { _id: { projectId: "$projectId", done: { $eq: ["$status", "completed"] } }, count: { $sum: 1 } } },
      ]);
      const progressMap = {};
      counts.forEach(c => {
        const pid = c._id.projectId?.toString();
        if (!pid) return;
        if (!progressMap[pid]) progressMap[pid] = { total: 0, done: 0 };
        progressMap[pid].total += c.count;
        if (c._id.done) progressMap[pid].done += c.count;
      });
      const projectsWithProgress = projects.map(p => ({
        ...p,
        progress: progressMap[p._id.toString()] || { total: 0, done: 0 },
      }));

      return res.json({ success: true, projects: projectsWithProgress });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST ── */
  if (req.method === "POST") {
    try {
      const {
        name,
        description,
        clientId,
        brandId,
        status,
        currentPhase,
        startDate,
        endDate,
        members,
        tags,
        budget,
        createdById,
        createdByModel = "AdminUser",
      } = req.body;

      if (!name?.trim()) return res.status(400).json({ success: false, message: "Project name is required" });

      const project = await Project.create({
        name:          name.trim(),
        description:   description   || "",
        clientId:      clientId      || null,
        brandId:       brandId       || null,
        status:        status        || "active",
        currentPhase:  currentPhase  || "development",
        startDate:     startDate     || null,
        endDate:       endDate       || null,
        members:       members       || [],
        tags:          tags          || [],
        budget:        budget        || null,
        createdBy:     createdById   || null,
        createdByModel,
      });

      const populated = await Project.findById(project._id)
        .populate("clientId", "name company email")
        .populate("brandId",  "name color")
        .populate("members",  "firstName lastName personal professional")
        .lean();

      return res.status(201).json({ success: true, project: populated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
