// GET /api/admin/brands/google-ads/callback
// Google redirects here after OAuth. Exchanges code for tokens and fetches accessible customers.
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { code, state: brandId, error } = req.query;
  const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const adminPage = `${baseUrl}/dashboard/admin/tasks/ads`;
  const redirect  = `${baseUrl}/api/admin/brands/google-ads/callback`;

  if (error) return res.redirect(`${adminPage}?adError=${encodeURIComponent(error)}`);
  if (!code || !brandId) return res.redirect(`${adminPage}?adError=Missing+code+or+state`);

  const clientId     = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const devToken     = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  if (!devToken) {
    return res.redirect(`${adminPage}?adError=${encodeURIComponent("GOOGLE_ADS_DEVELOPER_TOKEN not set. Apply at ads.google.com/home/tools/manager-accounts/ → API Center.")}`);
  }

  try {
    await dbConnect();

    // 1. Exchange code → tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirect, grant_type: "authorization_code" }),
    });
    const tokens = await tokenRes.json();
    if (tokens.error) throw new Error(`Token error: ${tokens.error_description || tokens.error}`);

    const { access_token, refresh_token } = tokens;

    // 2. List accessible customers (requires Developer Token)
    const customersRes = await fetch(
      "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
      { headers: { Authorization: `Bearer ${access_token}`, "developer-token": devToken } }
    );
    const customersData = await customersRes.json();
    if (customersData.error) throw new Error(`Google Ads API: ${customersData.error.message}`);

    const resourceNames = customersData.resourceNames || []; // ["customers/1234567890", ...]

    if (resourceNames.length === 0) {
      throw new Error("No Google Ads accounts found. Make sure this Google account has access to at least one Google Ads customer.");
    }

    // 3. Fetch names for each customer
    const customers = [];
    for (const rn of resourceNames.slice(0, 20)) {
      const custId = rn.split("/")[1];
      try {
        const infoRes = await fetch(
          `https://googleads.googleapis.com/v17/customers/${custId}`,
          { headers: { Authorization: `Bearer ${access_token}`, "developer-token": devToken } }
        );
        const info = await infoRes.json();
        customers.push({
          id:   custId,
          name: info.descriptiveName || info.id || custId,
          currency: info.currencyCode || "INR",
          testAccount: info.testAccount || false,
        });
      } catch { customers.push({ id: custId, name: custId, currency: "INR", testAccount: false }); }
    }

    // Store refresh token + pending customers
    await Brand.findByIdAndUpdate(brandId, {
      $set: {
        "googleAds.refreshToken":      refresh_token,
        "googleAds._pendingCustomers": customers,
      },
    });

    if (customers.length === 1) {
      // Auto-select single customer
      const c = customers[0];
      await Brand.findByIdAndUpdate(brandId, {
        $set: {
          "googleAds.connected":          true,
          "googleAds.customerId":         c.id,
          "googleAds.customerName":       c.name,
          "googleAds._pendingCustomers":  null,
        },
      });
      fetch(`${baseUrl}/api/admin/brands/${brandId}/google-ads/sync`, {
        method: "POST", headers: { Cookie: "admin_auth=true" },
      }).catch(() => {});
      return res.redirect(`${adminPage}?adConnected=${brandId}&adSource=google`);
    }

    return res.redirect(`${adminPage}?adSelectFor=${brandId}&adSource=google`);

  } catch (err) {
    console.error("[google-ads/callback]", err.message);
    return res.redirect(`${adminPage}?adError=${encodeURIComponent(err.message)}`);
  }
}
