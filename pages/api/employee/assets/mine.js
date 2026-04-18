// GET - employee's own assigned assets
import dbConnect from "@/utils/dbConnect";
import Asset from "@/models/assets/Asset";
import AssetLog from "@/models/assets/AssetLog";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();
  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  try {
    const assets = await Asset.find({ assignedTo: employee._id })
      .sort({ assignedDate: -1 })
      .lean();

    // recent history for this employee's assets
    const assetIds = assets.map(a => a._id);
    const logs = await AssetLog.find({
      asset: { $in: assetIds },
      $or: [{ toEmployee: employee._id }, { fromEmployee: employee._id }],
    }).sort({ createdAt: -1 }).limit(30).lean();

    return res.json({ success: true, assets, logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
