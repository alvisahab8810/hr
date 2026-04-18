// POST - mark asset as returned
import dbConnect from "@/utils/dbConnect";
import Asset from "@/models/assets/Asset";
import AssetLog from "@/models/assets/AssetLog";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  try {
    const { assetId, condition, performedBy, notes } = req.body;
    if (!assetId) return res.status(400).json({ success: false, message: "assetId is required" });

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    const prevEmployee  = asset.assignedTo;
    asset.lastReturnDate = new Date();
    asset.assignedTo    = null;
    asset.assignedDate  = undefined;
    asset.status        = "Available";
    if (condition) asset.condition = condition;
    await asset.save();

    await AssetLog.create({
      asset:        asset._id,
      assetName:    asset.name,
      assetId:      asset.assetId,
      action:       "Returned",
      fromEmployee: prevEmployee || undefined,
      performedBy:  performedBy || "Admin",
      notes:        notes || "Asset returned to inventory",
    });

    return res.json({ success: true, asset });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
