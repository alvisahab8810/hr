// GET — returns pending approval count for sidebar badge
// Pending = stage with done=true & !approved & !rejected, OR task with status="review"

import dbConnect      from "@/utils/dbConnect";
import Task           from "@/models/tasks/Task";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    // Tasks in "review" status (non-stage flow)
    const reviewCount = await Task.countDocuments({ status: "review" });

    // Tasks with at least one stage that is done but not yet approved/rejected
    const stagePendingDocs = await Task.find(
      { "stages.done": true },
      { stages: 1, _id: 0 }
    ).lean();

    let stagePendingCount = 0;
    for (const doc of stagePendingDocs) {
      for (const s of doc.stages || []) {
        if (s.done && !s.approved && !s.rejected) stagePendingCount++;
      }
    }

    return res.json({ success: true, count: reviewCount + stagePendingCount });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
