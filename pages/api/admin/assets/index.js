// GET  - list all assets (with optional filters)
// POST - create new asset
import dbConnect from "@/utils/dbConnect";
import Asset from "@/models/assets/Asset";
import AssetLog from "@/models/assets/AssetLog";
import Employee from "@/models/hr/Employee";

async function generateAssetId() {
  const count = await Asset.countDocuments();
  return `VAST-${String(count + 1).padStart(3, "0")}`;
}

export default async function handler(req, res) {
  await dbConnect();

  /* ── GET: list ── */
  if (req.method === "GET") {
    try {
      const { category, status, condition, search, employeeId } = req.query;
      const q = {};
      if (category)   q.category  = category;
      if (status)     q.status    = status;
      if (condition)  q.condition = condition;
      if (employeeId) q.assignedTo = employeeId;
      if (search) {
        q.$or = [
          { name:    { $regex: search, $options: "i" } },
          { assetId: { $regex: search, $options: "i" } },
          { brand:   { $regex: search, $options: "i" } },
          { serialNumber: { $regex: search, $options: "i" } },
        ];
      }
      const assets = await Asset.find(q)
        .populate("assignedTo", "personal professional firstName lastName email")
        .sort({ createdAt: -1 })
        .lean();
      return res.json({ success: true, assets });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST: create ── */
  if (req.method === "POST") {
    try {
      const assetId = await generateAssetId();
      const asset   = await Asset.create({ ...req.body, assetId });
      await AssetLog.create({
        asset:       asset._id,
        assetName:   asset.name,
        assetId:     asset.assetId,
        action:      "Created",
        performedBy: req.body.performedBy || "Admin",
        notes:       "Asset added to inventory",
      });
      return res.status(201).json({ success: true, asset });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  res.status(405).end();
}
