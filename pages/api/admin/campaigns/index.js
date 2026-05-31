// GET /api/admin/campaigns  — list all campaigns (optional ?platform=meta|google&brandId=)
// POST /api/admin/campaigns — create a new campaign
import dbConnect from "@/utils/dbConnect";
import AdCampaign from "@/models/AdCampaign";
import Brand from "@/models/tasks/Brand";
import "@/models/hr/Employee";

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

  /* ── GET ── */
  if (req.method === "GET") {
    const { platform, brandId } = req.query;
    const q = {};
    if (platform && platform !== "all") q.platform = platform;
    if (brandId) q.brandId = brandId;

    const campaigns = await AdCampaign.find(q)
      .populate("brandId", "name color slug metaAds googleAds")
      .sort({ createdAt: -1 })
      .lean();

    // Only show synced campaigns for brands that are currently connected.
    // Manually created campaigns (externalSource: "manual") always show.
    const filtered = campaigns.filter(c => {
      if (c.externalSource === "manual" || !c.externalSource) return true;
      const brand = c.brandId;
      if (!brand) return false;
      if (c.externalSource === "meta")   return brand.metaAds?.connected === true;
      if (c.externalSource === "google") return brand.googleAds?.connected === true;
      return true;
    });

    return res.json({ success: true, campaigns: filtered });
  }

  /* ── POST ── */
  if (req.method === "POST") {
    const { name, brandId, platform, budget, agenda, stages } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: "Campaign name required" });
    if (!brandId)      return res.status(400).json({ success: false, message: "Brand is required" });

    const DEFAULT_STAGES = [
      { key: "creative", label: "Creative production" },
      { key: "setup",    label: "Setup & targeting" },
      { key: "budget",   label: "Budget approval" },
      { key: "live",     label: "Live monitoring" },
      { key: "optimize", label: "Optimization" },
    ];

    const campaign = await AdCampaign.create({
      name:     name.trim(),
      brandId,
      platform: platform || "meta",
      budget:   Number(budget) || 0,
      agenda:   agenda || "",
      stages:   stages?.length ? stages : DEFAULT_STAGES,
    });

    const populated = await AdCampaign.findById(campaign._id)
      .populate("brandId", "name color slug")
      .lean();

    return res.status(201).json({ success: true, campaign: populated });
  }

  return res.status(405).end();
}
