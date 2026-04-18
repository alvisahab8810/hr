// GET - dashboard statistics
import dbConnect from "@/utils/dbConnect";
import Asset from "@/models/assets/Asset";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();
  try {
    const [total, assigned, available, retired, damaged, underRepair, byCategory] = await Promise.all([
      Asset.countDocuments(),
      Asset.countDocuments({ status: "Assigned" }),
      Asset.countDocuments({ status: "Available" }),
      Asset.countDocuments({ status: "Retired" }),
      Asset.countDocuments({ condition: "Damaged" }),
      Asset.countDocuments({ condition: "Under Repair" }),
      Asset.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
    ]);
    return res.json({ success: true, stats: { total, assigned, available, retired, damaged, underRepair, byCategory } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
