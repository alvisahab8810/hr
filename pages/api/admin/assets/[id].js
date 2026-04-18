// GET / PUT / DELETE for a single asset
import dbConnect from "@/utils/dbConnect";
import Asset from "@/models/assets/Asset";
import AssetLog from "@/models/assets/AssetLog";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const asset = await Asset.findById(id)
        .populate("assignedTo", "personal professional firstName lastName email")
        .lean();
      if (!asset) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, asset });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (req.method === "PUT") {
    try {
      const { performedBy, ...updates } = req.body;
      const asset = await Asset.findByIdAndUpdate(id, { $set: updates }, { new: true })
        .populate("assignedTo", "personal professional firstName lastName email");
      if (!asset) return res.status(404).json({ success: false, message: "Not found" });
      await AssetLog.create({
        asset: asset._id, assetName: asset.name, assetId: asset.assetId,
        action: "Updated", performedBy: performedBy || "Admin",
        notes: "Asset details updated",
      });
      return res.json({ success: true, asset });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      await Asset.findByIdAndDelete(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  res.status(405).end();
}
