// GET - recent task activity feed across all tasks

import dbConnect from "@/utils/dbConnect";
import TaskActivity from "@/models/tasks/TaskActivity";
import Task     from "@/models/tasks/Task";
import Brand    from "@/models/tasks/Brand";
import Employee from "@/models/hr/Employee";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();
  try {
    const limit = parseInt(req.query.limit) || 20;

    const activities = await TaskActivity.find({})
      .populate("taskId", "title nomenclature brandId")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({ success: true, activities });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
