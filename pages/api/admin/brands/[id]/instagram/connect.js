// GET /api/admin/brands/[id]/instagram/connect
// Returns the Facebook OAuth URL to start the Instagram connection flow
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

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();
  const { id } = req.query;

  const brand = await Brand.findById(id).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const appId      = process.env.FACEBOOK_APP_ID;
  const baseUrl    = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/admin/brands/instagram/callback`;

  if (!appId) {
    return res.status(500).json({ success: false, message: "FACEBOOK_APP_ID not set in environment" });
  }

  const scopes = [
    "instagram_basic",
    "instagram_manage_insights",
    "pages_show_list",
    "pages_read_engagement",
    "business_management",
  ].join(",");

  const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?` +
    `client_id=${appId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${id}` +
    `&response_type=code`;

  return res.json({ success: true, oauthUrl, redirectUri });
}
