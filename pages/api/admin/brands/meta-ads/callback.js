// GET /api/admin/brands/meta-ads/callback
// Facebook redirects here after user grants ads_read permissions.
// Fetches all accessible ad accounts and stores them pending admin selection.
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

async function fbFetch(url) {
  const r = await fetch(url);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { code, state: brandId, error, error_description } = req.query;
  const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const adminPage = `${baseUrl}/dashboard/admin/tasks/ads`;
  const redirect  = `${baseUrl}/api/admin/brands/meta-ads/callback`;

  if (error) return res.redirect(`${adminPage}?adError=${encodeURIComponent(error_description || error)}`);
  if (!code || !brandId) return res.redirect(`${adminPage}?adError=Missing+code+or+state`);

  const appId     = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  try {
    await dbConnect();

    // 1. Exchange code → short-lived token
    const tokenRes = await fbFetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${appId}&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirect)}&code=${code}`
    );

    // 2. Exchange → long-lived token (60 days)
    const longRes = await fbFetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?grant_type=fb_exchange_token&client_id=${appId}` +
      `&client_secret=${appSecret}&fb_exchange_token=${tokenRes.access_token}`
    );
    const longToken   = longRes.access_token;
    const tokenExpiry = new Date(Date.now() + (longRes.expires_in || 5184000) * 1000);

    // 3. Fetch all accessible ad accounts
    const accounts = [];
    let url = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,currency,account_status,business&limit=50&access_token=${longToken}`;
    while (url) {
      const res2 = await fbFetch(url);
      for (const acc of res2.data || []) {
        // account_status 1 = ACTIVE, 2 = DISABLED, 3 = UNSETTLED, 7 = PENDING_RISK_REVIEW, 9 = IN_GRACE_PERIOD, 100 = PENDING_CLOSURE, 101 = CLOSED, 201 = ANY_ACTIVE, 202 = ANY_CLOSED
        accounts.push({
          id:       acc.id,           // "act_XXXXXXXXXX"
          name:     acc.name,
          currency: acc.currency,
          status:   acc.account_status === 1 ? "active" : "inactive",
          business: acc.business?.name || "",
        });
      }
      url = res2.paging?.next || null;
    }

    if (accounts.length === 0) {
      throw new Error("No ad accounts found. Make sure this Facebook account manages at least one Meta Ads account.");
    }

    // 4a. Only one account → auto-connect
    if (accounts.length === 1) {
      const acc = accounts[0];
      await Brand.findByIdAndUpdate(brandId, {
        $set: {
          "metaAds.connected":      true,
          "metaAds.adAccountId":    acc.id,
          "metaAds.adAccountName":  acc.name,
          "metaAds.token":          longToken,
          "metaAds.tokenExpiry":    tokenExpiry,
          "metaAds.lastSync":       null,
          "metaAds._pendingAccounts": null,
        },
      });
      // Fire first sync in background
      fetch(`${baseUrl}/api/admin/brands/${brandId}/meta-ads/sync`, {
        method: "POST", headers: { Cookie: "admin_auth=true" },
      }).catch(() => {});
      return res.redirect(`${adminPage}?adConnected=${brandId}&adSource=meta`);
    }

    // 4b. Multiple accounts → store pending, redirect to selection UI
    await Brand.findByIdAndUpdate(brandId, {
      $set: { "metaAds._pendingAccounts": accounts },
    });
    return res.redirect(`${adminPage}?adSelectFor=${brandId}&adSource=meta`);

  } catch (err) {
    console.error("[meta-ads/callback]", err.message);
    return res.redirect(`${adminPage}?adError=${encodeURIComponent(err.message)}`);
  }
}
