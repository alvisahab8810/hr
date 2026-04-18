// POST - assign asset to an employee (or reassign)
import dbConnect from "@/utils/dbConnect";
import Asset from "@/models/assets/Asset";
import AssetLog from "@/models/assets/AssetLog";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  try {
    const { assetId, employeeId, assignedDate, performedBy, notes } = req.body;
    if (!assetId || !employeeId) return res.status(400).json({ success: false, message: "assetId and employeeId are required" });

    const asset = await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    const prevEmployee = asset.assignedTo;
    const action = prevEmployee ? "Reassigned" : "Assigned";

    asset.assignedTo   = employeeId;
    asset.assignedDate = assignedDate ? new Date(assignedDate) : new Date();
    asset.status       = "Assigned";
    await asset.save();

    await AssetLog.create({
      asset:        asset._id,
      assetName:    asset.name,
      assetId:      asset.assetId,
      action,
      fromEmployee: prevEmployee || undefined,
      toEmployee:   employeeId,
      performedBy:  performedBy || "Admin",
      notes:        notes || `Asset ${action.toLowerCase()} to employee`,
    });

    const populated = await Asset.findById(asset._id)
      .populate("assignedTo", "personal professional firstName lastName email");
    return res.json({ success: true, asset: populated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
