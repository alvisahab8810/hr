// GET    - single sprint detail with task stats
// PATCH  - update sprint
// DELETE - delete sprint

import dbConnect from "@/utils/dbConnect";
import Sprint from "@/models/projects/Sprint";
import Task   from "@/models/tasks/Task";

import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const sprint = await Sprint.findById(id)
        .populate("projectId", "name status clientId")
        .lean();

      if (!sprint) return res.status(404).json({ success: false, message: "Sprint not found" });

      const taskStats = await Task.aggregate([
        { $match: { sprintId: sprint._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]);

      return res.json({ success: true, sprint, taskStats });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── PATCH ── */
  if (req.method === "PATCH") {
    try {
      const sprint = await Sprint.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true }
      ).populate("projectId", "name status").lean();

      if (!sprint) return res.status(404).json({ success: false, message: "Sprint not found" });
      return res.json({ success: true, sprint });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── DELETE ── */
  if (req.method === "DELETE") {
    try {
      await Sprint.findByIdAndDelete(id);
      return res.json({ success: true, message: "Sprint deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
