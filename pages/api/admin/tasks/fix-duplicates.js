// POST /api/admin/tasks/fix-duplicates
// One-time cleanup: for each (brandId, nomenclature) group with more than one task,
// keep the OLDEST task and delete the newer duplicates.
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();

  try {
    // Find all nomenclature values that appear more than once for the same brand
    const dupes = await Task.aggregate([
      { $match: { nomenclature: { $ne: "" }, brandId: { $ne: null } } },
      { $group: { _id: { brandId: "$brandId", nomenclature: "$nomenclature" }, count: { $sum: 1 }, ids: { $push: "$_id" }, dates: { $push: "$createdAt" } } },
      { $match: { count: { $gt: 1 } } },
    ]);

    if (dupes.length === 0) {
      return res.json({ success: true, message: "No duplicates found", deleted: [] });
    }

    const toDelete = [];
    for (const group of dupes) {
      // Sort by createdAt ascending — keep the oldest, delete the rest
      const paired = group.ids.map((id, i) => ({ id, date: group.dates[i] }));
      paired.sort((a, b) => new Date(a.date) - new Date(b.date));
      const [, ...extras] = paired; // skip oldest
      toDelete.push(...extras.map(e => e.id));
    }

    await Task.deleteMany({ _id: { $in: toDelete } });

    return res.json({
      success: true,
      message: `Deleted ${toDelete.length} duplicate task(s)`,
      deleted: toDelete.map(String),
      groups: dupes.map(g => ({ brandId: g._id.brandId, nomenclature: g._id.nomenclature, count: g.count })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
