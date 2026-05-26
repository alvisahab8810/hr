// GET /api/client/gsc?brandSlug=...&days=28
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

function getClientToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
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
  if (!data.access_token) {
    throw new Error(data.error_description || data.error || "Failed to get access token");
  }
  return data.access_token;
}

async function queryGSC(token, siteUrl, body) {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(endpoint, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify(body),
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const payload = getClientToken(req);
  if (!payload || payload.role !== "client") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();

  const { brandSlug, days = "28" } = req.query;
  if (!brandSlug) return res.status(400).json({ success: false, message: "brandSlug required" });

  const brand = await Brand.findOne({ slug: brandSlug }).select("+gsc.refreshToken").lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
  if (!brand.clientId || brand.clientId.toString() !== payload.id) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  const siteUrl      = brand.gsc?.siteUrl;
  const refreshToken = brand.gsc?.refreshToken;

  if (!siteUrl || !refreshToken) {
    return res.json({ success: true, configured: false, data: null });
  }

  try {
    const accessToken = await getAccessToken(refreshToken);
    const daysNum = Math.min(Math.max(parseInt(days, 10) || 28, 7), 90);

    // GSC has a ~3-day reporting lag
    const endDate   = new Date();
    endDate.setDate(endDate.getDate() - 3);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - daysNum);

    const fmt = d => d.toISOString().split("T")[0];
    const base = { startDate: fmt(startDate), endDate: fmt(endDate) };

    const [byDate, byQuery, byPage] = await Promise.all([
      queryGSC(accessToken, siteUrl, { ...base, dimensions: ["date"],  rowLimit: 90 }),
      queryGSC(accessToken, siteUrl, { ...base, dimensions: ["query"], rowLimit: 25 }),
      queryGSC(accessToken, siteUrl, { ...base, dimensions: ["page"],  rowLimit: 15 }),
    ]);

    return res.json({
      success:    true,
      configured: true,
      siteUrl,
      period:     { startDate: base.startDate, endDate: base.endDate, days: daysNum },
      byDate:     byDate.rows  || [],
      byQuery:    byQuery.rows || [],
      byPage:     byPage.rows  || [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
