// DELETE /api/admin/brands/[id]/meta-ads/disconnect
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";
import AdCampaign from "@/models/AdCampaign";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();
  const { id } = req.query;

  await Brand.findByIdAndUpdate(id, {
    $set: {
      "metaAds.connected":        false,
      "metaAds.adAccountId":      "",
      "metaAds.adAccountName":    "",
      "metaAds.token":            "",
      "metaAds.tokenExpiry":      null,
      "metaAds._pendingAccounts": null,
    },
  });

  // Delete synced campaigns for this brand — they're no longer valid
  // Manual campaigns (externalSource: "manual") are preserved
  await AdCampaign.deleteMany({ brandId: id, externalSource: "meta" });

  return res.json({ success: true });
}
