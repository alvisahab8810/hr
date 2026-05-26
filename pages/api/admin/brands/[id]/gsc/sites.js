// GET /api/admin/brands/[id]/gsc/sites — list available GSC properties using stored refresh token
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

function adminGuard(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

async function getAccessToken(refreshToken) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    new URLSearchParams({
      refresh_token:  refreshToken,
      client_id:      process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret:  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      grant_type:     "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || "Failed to refresh token");
  return data.access_token;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();
  const { id } = req.query;

  try {
    const brand = await Brand.findById(id).select("+gsc.refreshToken").lean();
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

    const refreshToken = brand.gsc?.refreshToken;
    if (!refreshToken) {
      return res.json({ success: true, sites: [], connected: false });
    }

    const accessToken = await getAccessToken(refreshToken);

    const sitesRes  = await fetch("https://www.googleapis.com/webmasters/v3/sites", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const sitesData = await sitesRes.json();
    const sites = (sitesData.siteEntry || []).map(s => s.siteUrl);

    return res.json({ success: true, sites, connected: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
