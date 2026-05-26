// GET    - single brand with task stats
// PATCH  - update brand
// DELETE - delete brand

import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";
import Task  from "@/models/tasks/Task";
import "@/models/clients/Client";
import "@/models/hr/Employee";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const brand = await Brand.findById(id)
        .populate("clientId", "name company email")
        .populate("managers", "personal.firstName personal.lastName professional.designation")
        .lean();

      if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

      const [taskStats, stageStats] = await Promise.all([
        Task.aggregate([
          { $match: { brandId: brand._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: { brandId: brand._id } },
          { $group: { _id: "$stage", count: { $sum: 1 } } },
        ]),
      ]);

      return res.json({ success: true, brand, taskStats, stageStats });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── PATCH ── */
  if (req.method === "PATCH") {
    try {
      const brand = await Brand.findByIdAndUpdate(
        id,
        { $set: req.body },
        { new: true }
      )
        .populate("clientId", "name company")
        .lean();

      if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
      return res.json({ success: true, brand });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── DELETE ── */
  if (req.method === "DELETE") {
    try {
      await Brand.findByIdAndDelete(id);
      return res.json({ success: true, message: "Brand deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
