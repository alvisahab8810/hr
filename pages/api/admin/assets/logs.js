// GET - audit logs (recent first)
import dbConnect from "@/utils/dbConnect";
import AssetLog from "@/models/assets/AssetLog";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();
  try {
    const { limit = 100 } = req.query;
    const logs = await AssetLog.find()
      .populate("fromEmployee", "personal firstName lastName")
      .populate("toEmployee",   "personal firstName lastName")
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();
    return res.json({ success: true, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
