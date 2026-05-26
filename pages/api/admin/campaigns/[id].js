// PATCH /api/admin/campaigns/[id] — update campaign (status, performance, stages, etc.)
// DELETE /api/admin/campaigns/[id] — delete campaign
import dbConnect from "@/utils/dbConnect";
import AdCampaign from "@/models/AdCampaign";
import "@/models/tasks/Brand";

function adminGuard(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();
  const { id } = req.query;

  if (req.method === "PATCH") {
    const allowed = ["name", "status", "budget", "agenda", "platform", "stages", "performance", "creatives", "brandId"];
    const update = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) update[key] = req.body[key];
    }
    if (update.budget !== undefined) update.budget = Number(update.budget) || 0;

    const campaign = await AdCampaign.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("brandId", "name color slug")
      .lean();

    if (!campaign) return res.status(404).json({ success: false, message: "Campaign not found" });
    return res.json({ success: true, campaign });
  }

  if (req.method === "DELETE") {
    await AdCampaign.findByIdAndDelete(id);
    return res.json({ success: true });
  }

  return res.status(405).end();
}
