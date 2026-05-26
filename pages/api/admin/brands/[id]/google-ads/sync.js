// POST /api/admin/brands/[id]/google-ads/sync
// Fetches real campaign data from Google Ads API (REST) and upserts into AdCampaign collection.
// Requires: GOOGLE_ADS_CLIENT_ID, GOOGLE_ADS_CLIENT_SECRET, GOOGLE_ADS_DEVELOPER_TOKEN in .env
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";
import AdCampaign from "@/models/AdCampaign";

async function refreshAccessToken(refreshToken) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_ADS_CLIENT_ID,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    "refresh_token",
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(`Token refresh failed: ${d.error_description || d.error}`);
  return d.access_token;
}

function mapGoogleStatus(status) {
  switch (status) {
    case "ENABLED":  return "active";
    case "PAUSED":   return "paused";
    case "REMOVED":  return "completed";
    default:         return "planned";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!devToken) {
    return res.status(400).json({
      success: false,
      message: "GOOGLE_ADS_DEVELOPER_TOKEN not set. Apply at ads.google.com → Tools & Settings → API Center.",
    });
  }

  await dbConnect();
  const { id } = req.query;

  const brand = await Brand.findById(id).select("+googleAds.refreshToken").lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
  if (!brand.googleAds?.connected) return res.status(400).json({ success: false, message: "Google Ads not connected for this brand" });

  const { customerId, refreshToken } = brand.googleAds;
  if (!refreshToken || !customerId)
    return res.status(400).json({ success: false, message: "Missing credentials — please reconnect Google Ads" });

  try {
    const accessToken = await refreshAccessToken(refreshToken);
    const custId      = customerId.replace(/-/g, ""); // strip dashes

    // GAQL query: campaigns + this-month metrics
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.budget_amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.conversions_value,
        metrics.all_conversions,
        metrics.view_through_conversions
      FROM campaign
      WHERE segments.date DURING THIS_MONTH
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
      LIMIT 100
    `;

    const searchRes = await fetch(
      `https://googleads.googleapis.com/v17/customers/${custId}/googleAds:search`,
      {
        method: "POST",
        headers: {
          Authorization:    `Bearer ${accessToken}`,
          "developer-token": devToken,
          "Content-Type":   "application/json",
        },
        body: JSON.stringify({ query }),
      }
    );

    const searchData = await searchRes.json();

    if (searchData.error) {
      // Specific handling for common errors
      const msg = searchData.error.message || JSON.stringify(searchData.error);
      if (msg.includes("DEVELOPER_TOKEN_NOT_APPROVED")) {
        return res.status(403).json({ success: false, message: "Your Google Ads Developer Token is pending approval. Apply for Basic Access at ads.google.com → Tools → API Center." });
      }
      throw new Error(`Google Ads API: ${msg}`);
    }

    const rows = searchData.results || [];

    if (rows.length === 0) {
      await Brand.findByIdAndUpdate(id, { $set: { "googleAds.lastSync": new Date() } });
      return res.json({ success: true, synced: 0, message: "No active campaigns found this month" });
    }

    let synced = 0;
    for (const row of rows) {
      const c       = row.campaign;
      const m       = row.metrics;
      const spend   = (m.costMicros || 0) / 1_000_000;        // micros → actual currency
      const budget  = (c.budgetAmountMicros || 0) / 1_000_000;
      const convs   = Number(m.conversions || m.allConversions || 0);
      const convVal = Number(m.conversionsValue || 0);
      const impr    = Number(m.impressions || 0);
      const clicks  = Number(m.clicks || 0);
      const roas    = spend > 0 && convVal > 0 ? Math.round((convVal / spend) * 100) / 100 : null;
      const cpa     = convs > 0 ? Math.round(spend / convs) : null;
      const ctr     = impr > 0 ? Math.round((clicks / impr) * 10000) / 100 : null;

      await AdCampaign.findOneAndUpdate(
        { brandId: brand._id, externalId: String(c.id), externalSource: "google" },
        {
          $set: {
            name:           c.name,
            platform:       "google",
            status:         mapGoogleStatus(c.status),
            budget:         Math.round(budget),
            externalId:     String(c.id),
            externalSource: "google",
            "performance.spent":       Math.round(spend),
            "performance.impressions": impr,
            "performance.clicks":      clicks,
            "performance.conversions": Math.round(convs),
            "performance.roas":        roas,
            "performance.cpa":         cpa,
            "performance.ctr":         ctr,
          },
          $setOnInsert: { brandId: brand._id },
        },
        { upsert: true, new: true }
      );
      synced++;
    }

    await Brand.findByIdAndUpdate(id, { $set: { "googleAds.lastSync": new Date() } });
    return res.json({ success: true, synced, message: `Synced ${synced} campaign${synced !== 1 ? "s" : ""} from Google Ads` });

  } catch (err) {
    console.error("[google-ads/sync]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
