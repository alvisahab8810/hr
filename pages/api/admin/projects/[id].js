// GET    - single project detail
// PATCH  - update project
// DELETE - delete project (and its sprints)

import dbConnect from "@/utils/dbConnect";
import Project from "@/models/projects/Project";
import Sprint  from "@/models/projects/Sprint";
import Task    from "@/models/tasks/Task";
import "@/models/clients/Client";
import "@/models/hr/Employee";
import "@/models/tasks/Brand";

import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const project = await Project.findById(id)
        .populate("clientId", "name company email")
        .populate("members",  "firstName lastName personal professional")
        .lean();

      if (!project) return res.status(404).json({ success: false, message: "Project not found" });

      const [sprints, taskStats] = await Promise.all([
        Sprint.find({ projectId: id }).sort({ createdAt: -1 }).lean(),
        Task.aggregate([
          { $match: { projectId: project._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      return res.json({ success: true, project, sprints, taskStats });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── PATCH ── */
  if (req.method === "PATCH") {
    try {
      const project = await Project.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true }
      )
        .populate("clientId", "name company email")
        .populate("members",  "firstName lastName personal professional")
        .lean();

      if (!project) return res.status(404).json({ success: false, message: "Project not found" });
      return res.json({ success: true, project });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── DELETE ── */
  if (req.method === "DELETE") {
    try {
      await Project.findByIdAndDelete(id);
      await Sprint.deleteMany({ projectId: id });
      return res.json({ success: true, message: "Project deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
