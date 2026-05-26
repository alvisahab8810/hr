// POST /api/admin/brands/[id]/meta-ads/sync
// Fetches real campaign data from the Meta Marketing API and upserts into AdCampaign collection.
// Metrics pulled: spend, impressions, clicks, reach, conversions, ROAS, CPA, CTR
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";
import AdCampaign from "@/models/AdCampaign";

async function fbFetch(url) {
  const r = await fetch(url);
  const d = await r.json();
  if (d.error) throw new Error(`Meta API: ${d.error.message} (code ${d.error.code})`);
  return d;
}

// Convert Meta campaign status → our status
function mapStatus(fbStatus) {
  switch (fbStatus) {
    case "ACTIVE":    return "active";
    case "PAUSED":    return "paused";
    case "ARCHIVED":
    case "DELETED":   return "completed";
    default:          return "planned";
  }
}

// Extract total conversions from actions array
function sumConversions(actions = []) {
  const convTypes = ["purchase", "lead", "complete_registration", "subscribe", "contact", "find_location", "schedule", "start_trial", "submit_application"];
  return actions.filter(a => convTypes.some(t => a.action_type?.includes(t))).reduce((s, a) => s + Number(a.value || 0), 0);
}

// Extract total conversion value from action_values (for ROAS)
function sumConvValue(actionValues = []) {
  return actionValues.filter(a => a.action_type?.includes("purchase") || a.action_type?.includes("omni_purchase")).reduce((s, a) => s + Number(a.value || 0), 0);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();
  const { id } = req.query;

  const brand = await Brand.findById(id).select("+metaAds.token +metaAds.tokenExpiry").lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
  if (!brand.metaAds?.connected) return res.status(400).json({ success: false, message: "Meta Ads not connected for this brand" });

  const token     = brand.metaAds.token;
  const accountId = brand.metaAds.adAccountId; // "act_XXXXXXXXXX"

  if (!token || !accountId) return res.status(400).json({ success: false, message: "No token or account ID stored — please reconnect" });

  try {
    // 1. Fetch all campaigns in the ad account
    const campaigns = [];
    let campsUrl = `https://graph.facebook.com/v19.0/${accountId}/campaigns` +
      `?fields=id,name,status,objective,daily_budget,lifetime_budget` +
      `&limit=100&access_token=${token}`;
    while (campsUrl) {
      const d = await fbFetch(campsUrl);
      campaigns.push(...(d.data || []));
      campsUrl = d.paging?.next || null;
    }

    if (campaigns.length === 0) {
      await Brand.findByIdAndUpdate(id, { $set: { "metaAds.lastSync": new Date() } });
      return res.json({ success: true, synced: 0, message: "No campaigns found in this ad account" });
    }

    // 2. Fetch campaign-level insights for this month in one batch request
    // Use batch API to avoid N+1 requests
    const insightsMap = {};
    const batchSize = 50;
    for (let i = 0; i < campaigns.length; i += batchSize) {
      const batch = campaigns.slice(i, i + batchSize).map(c => ({
        method: "GET",
        relative_url: `${c.id}/insights?fields=spend,impressions,clicks,reach,actions,action_values,cost_per_action_type&date_preset=this_month&access_token=${token}`,
      }));
      const batchRes = await fetch(`https://graph.facebook.com/v19.0/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          access_token: token,
          batch: JSON.stringify(batch),
        }),
      });
      const batchData = await batchRes.json();
      if (!Array.isArray(batchData)) throw new Error("Batch API returned unexpected response");

      for (let j = 0; j < batch.length; j++) {
        const campId = campaigns[i + j].id;
        const item   = batchData[j];
        if (!item || item.code !== 200) { insightsMap[campId] = null; continue; }
        const parsed = JSON.parse(item.body);
        insightsMap[campId] = parsed.data?.[0] || null;
      }
    }

    // 3. Upsert each campaign into AdCampaign collection
    let synced = 0;
    for (const c of campaigns) {
      const ins    = insightsMap[c.id] || {};
      const spend  = Number(ins.spend || 0);
      const convs  = sumConversions(ins.actions);
      const convVal= sumConvValue(ins.action_values);
      const roas   = spend > 0 && convVal > 0 ? Math.round((convVal / spend) * 100) / 100 : null;
      const cpa    = convs > 0 ? Math.round(spend / convs) : null;
      const impr   = Number(ins.impressions || 0);
      const clicks = Number(ins.clicks || 0);
      const ctr    = impr > 0 ? Math.round((clicks / impr) * 10000) / 100 : null; // percentage
      const reach  = Number(ins.reach || 0);

      // Budget: Meta stores in smallest currency unit (paise for INR, cents for USD)
      const rawBudget = Number(c.daily_budget || c.lifetime_budget || 0);
      const budget    = Math.round(rawBudget / 100);

      await AdCampaign.findOneAndUpdate(
        { brandId: brand._id, externalId: c.id, externalSource: "meta" },
        {
          $set: {
            name:           c.name,
            platform:       "meta",
            status:         mapStatus(c.status),
            budget,
            externalId:     c.id,
            externalSource: "meta",
            "performance.spent":       spend,
            "performance.impressions": impr,
            "performance.clicks":      clicks,
            "performance.reach":       reach,
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

    // 4. Update lastSync timestamp
    await Brand.findByIdAndUpdate(id, { $set: { "metaAds.lastSync": new Date() } });

    return res.json({ success: true, synced, message: `Synced ${synced} campaign${synced !== 1 ? "s" : ""} from Meta Ads` });

  } catch (err) {
    console.error("[meta-ads/sync]", err.message);
    // Token expired check
    if (err.message.includes("OAuthException") || err.message.includes("190")) {
      await Brand.findByIdAndUpdate(id, { $set: { "metaAds.connected": false } });
      return res.status(401).json({ success: false, message: "Meta Ads token expired. Please reconnect." });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
}
