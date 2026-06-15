// PATCH  - update feature (status, assignedTo, priority, etc.)
// DELETE - delete feature

import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import "@/models/hr/Employee";

import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  /* ── PATCH ── */
  if (req.method === "PATCH") {
    try {
      const update = { ...req.body };
      if ("status" in update) {
        update.statusUpdatedAt = new Date();
        if (update.statusUpdatedBy) {
          // keep what was passed
        }
      }
      const feature = await Task.findByIdAndUpdate(
        id,
        { $set: update },
        { new: true }
      )
        .populate("assignedTo", "firstName lastName personal professional")
        .populate("statusUpdatedBy", "firstName lastName personal professional")
        .lean();

      if (!feature) return res.status(404).json({ success: false, message: "Feature not found" });
      return res.json({ success: true, feature });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── DELETE ── */
  if (req.method === "DELETE") {
    try {
      await Task.findByIdAndDelete(id);
      return res.json({ success: true, message: "Feature deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
