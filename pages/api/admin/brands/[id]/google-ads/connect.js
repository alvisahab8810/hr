// GET /api/admin/brands/[id]/google-ads/connect
// Generates Google OAuth URL for Google Ads access
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();
  const brand = await Brand.findById(req.query.id).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const clientId  = process.env.GOOGLE_ADS_CLIENT_ID;
  const baseUrl   = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const redirect  = `${baseUrl}/api/admin/brands/google-ads/callback`;

  if (!clientId) return res.status(500).json({ success: false, message: "GOOGLE_ADS_CLIENT_ID not set in .env" });

  const oauthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirect)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent("https://www.googleapis.com/auth/adwords")}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&state=${req.query.id}`;

  return res.json({ success: true, oauthUrl });
}
