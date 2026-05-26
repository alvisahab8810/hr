// GET /api/admin/brands/[id]/gsc/connect — redirect to Google OAuth consent
export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { id } = req.query;
  const clientId   = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ success: false, message: "Google OAuth not configured in .env.local" });
  }

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",     clientId);
  url.searchParams.set("redirect_uri",  redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope",         "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/userinfo.email");
  url.searchParams.set("access_type",   "offline");
  url.searchParams.set("prompt",        "consent");
  url.searchParams.set("state",         id);

  return res.redirect(302, url.toString());
}
