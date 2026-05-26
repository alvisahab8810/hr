// GET /api/admin/brands/[id]/meta-ads/connect
// Generates Facebook OAuth URL to start Meta Ads connection
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

function adminGuard(req, res) {
  if (!(req.headers.cookie || "").includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();
  const { id } = req.query;
  const brand = await Brand.findById(id).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const appId     = process.env.FACEBOOK_APP_ID;
  const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const redirect  = `${baseUrl}/api/admin/brands/meta-ads/callback`;

  if (!appId) return res.status(500).json({ success: false, message: "FACEBOOK_APP_ID not set" });

  const scopes = ["ads_read", "ads_management", "business_management", "pages_show_list"].join(",");

  const oauthUrl =
    `https://www.facebook.com/v19.0/dialog/oauth` +
    `?client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${id}` +
    `&response_type=code`;

  return res.json({ success: true, oauthUrl });
}
