// GET /api/admin/brands/instagram/callback
// Facebook redirects here after the user grants permissions.
// Collects ALL available Instagram accounts, lets admin select if multiple.
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

async function igFetch(url) {
  const r = await fetch(url);
  const d = await r.json();
  if (d.error) throw new Error(d.error.message);
  return d;
}

// Fetches ALL Facebook Pages the user directly manages (me/accounts), following pagination
async function getDirectPages(token) {
  const pages = [];
  let url = `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token&limit=100&access_token=${token}`;
  while (url) {
    const res = await igFetch(url);
    pages.push(...(res.data || []));
    url = res.paging?.next || null;
  }
  return pages;
}

// Fetches pages accessible via Facebook Business Manager (owned + client pages)
async function getBusinessPages(token) {
  const pages = [];
  try {
    const bizRes = await igFetch(
      `https://graph.facebook.com/v19.0/me/businesses?fields=id,name&limit=50&access_token=${token}`
    );
    for (const biz of bizRes.data || []) {
      for (const edge of ["owned_pages", "client_pages"]) {
        let url = `https://graph.facebook.com/v19.0/${biz.id}/${edge}?fields=id,name,access_token&limit=100&access_token=${token}`;
        while (url) {
          try {
            const res = await igFetch(url);
            pages.push(...(res.data || []));
            url = res.paging?.next || null;
          } catch { url = null; }
        }
      }
    }
  } catch { /* business_management not granted or no businesses */ }
  return pages;
}

// Fetches ALL pages across direct ownership + Business Manager, deduplicated by id
async function getAllPages(token) {
  const [direct, biz] = await Promise.all([getDirectPages(token), getBusinessPages(token)]);
  const seen = new Set();
  const pages = [];
  for (const p of [...direct, ...biz]) {
    if (p.id && !seen.has(p.id)) { seen.add(p.id); pages.push(p); }
  }
  return pages;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { code, state: brandId, error, error_description } = req.query;
  const baseUrl    = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const adminPage  = `${baseUrl}/dashboard/admin/tasks/instagram`;

  if (error) return res.redirect(`${adminPage}?error=${encodeURIComponent(error_description || error)}`);
  if (!code || !brandId) return res.redirect(`${adminPage}?error=Missing+code+or+state`);

  const appId      = process.env.FACEBOOK_APP_ID;
  const appSecret  = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = `${baseUrl}/api/admin/brands/instagram/callback`;

  try {
    await dbConnect();

    // 1. Exchange code → short-lived token
    const tokenRes = await igFetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?client_id=${appId}&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    const shortToken = tokenRes.access_token;

    // 2. Exchange → long-lived token (60 days)
    const longRes = await igFetch(
      `https://graph.facebook.com/v19.0/oauth/access_token` +
      `?grant_type=fb_exchange_token&client_id=${appId}` +
      `&client_secret=${appSecret}&fb_exchange_token=${shortToken}`
    );
    const longToken   = longRes.access_token;
    const expiresIn   = longRes.expires_in || 5184000;
    const tokenExpiry = new Date(Date.now() + expiresIn * 1000);

    // 3. Get ALL Facebook Pages this user manages (paginated)
    const pages = await getAllPages(longToken);
    if (pages.length === 0) throw new Error("No Facebook Pages found. Connect a Facebook Page to your Instagram account first.");

    // 4. Find ALL Instagram Business accounts connected to any of these pages
    const availableAccounts = [];
    for (const page of pages) {
      try {
        const igRes = await igFetch(
          `https://graph.facebook.com/v19.0/${page.id}` +
          `?fields=instagram_business_account,name&access_token=${page.access_token || longToken}`
        );
        if (igRes.instagram_business_account?.id) {
          const igId = igRes.instagram_business_account.id;
          const profile = await igFetch(
            `https://graph.facebook.com/v19.0/${igId}` +
            `?fields=username,followers_count&access_token=${page.access_token || longToken}`
          );
          availableAccounts.push({
            igId,
            username:       profile.username       || "",
            followersCount: profile.followers_count || 0,
            pageName:       igRes.name || page.name || "",
            pageToken:      page.access_token || longToken,
            tokenExpiry:    tokenExpiry.toISOString(),
          });
        }
      } catch { /* page may not have Instagram */ }
    }

    if (availableAccounts.length === 0) {
      throw new Error("No Instagram Business account found. Make sure your Instagram is connected to a Facebook Page as a Business or Creator account.");
    }

    // 5a. Only one account → auto-connect
    if (availableAccounts.length === 1) {
      const acc = availableAccounts[0];
      await Brand.findByIdAndUpdate(brandId, {
        $set: {
          "instagram.connected":      true,
          "instagram.userId":         acc.igId,
          "instagram.username":       acc.username,
          "instagram.token":          acc.pageToken,
          "instagram.tokenExpiry":    tokenExpiry,
          "instagram.followersCount": acc.followersCount,
          "instagram.lastSync":       null,
          "instagram._pendingToken":    "",
          "instagram._pendingAccounts": null,
        },
      });
      // Fire first sync
      fetch(`${baseUrl}/api/admin/brands/${brandId}/instagram/sync`, {
        method: "POST", headers: { "Cookie": "admin_auth=true" },
      }).catch(() => {});
      return res.redirect(`${adminPage}?connected=${brandId}&username=${acc.username}`);
    }

    // 5b. Multiple accounts → save pending, redirect to selection UI
    await Brand.findByIdAndUpdate(brandId, {
      $set: {
        "instagram._pendingAccounts": availableAccounts,
      },
    });

    return res.redirect(`${adminPage}?selectFor=${brandId}`);

  } catch (err) {
    console.error("[instagram/callback]", err.message);
    return res.redirect(`${adminPage}?error=${encodeURIComponent(err.message)}`);
  }
}
