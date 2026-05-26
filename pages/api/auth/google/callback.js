// GET /api/auth/google/callback?code=xxx&state={brandId}
// Handles Google OAuth2 redirect for GSC integration
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  const { code, state: brandId, error } = req.query;
  const brandsBase = `/dashboard/admin/tasks/brands`;

  if (error) {
    return res.redirect(302, `${brandsBase}?selectBrand=${brandId}&gsc=error&msg=${encodeURIComponent(error)}`);
  }

  if (!code || !brandId) {
    return res.redirect(302, `${brandsBase}?gsc=error&msg=invalid_callback`);
  }

  const clientId     = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  redirectUri,
        grant_type:    "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();

    if (!tokens.access_token) {
      throw new Error(tokens.error_description || tokens.error || "Token exchange failed");
    }

    // Get user email
    const userRes  = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const userInfo = await userRes.json();

    await dbConnect();

    const update = {
      "gsc.email":       userInfo.email || "",
      "gsc.connectedAt": new Date(),
    };
    // Google only returns refresh_token on first consent; always save it if present
    if (tokens.refresh_token) {
      update["gsc.refreshToken"] = tokens.refresh_token;
    }

    await Brand.findByIdAndUpdate(brandId, { $set: update });

    return res.redirect(302, `/dashboard/admin/tasks/brands?selectBrand=${brandId}&gsc=connected&email=${encodeURIComponent(userInfo.email || "")}`);
  } catch (err) {
    return res.redirect(302, `/dashboard/admin/tasks/brands?selectBrand=${brandId}&gsc=error&msg=${encodeURIComponent(err.message)}`);
  }
}
