// GET /api/client/campaigns?brandSlug=... — campaigns for a client brand
import dbConnect from "@/utils/dbConnect";
import AdCampaign from "@/models/AdCampaign";
import Brand from "@/models/tasks/Brand";
import jwt from "jsonwebtoken";

function getClientId(req) {
  const cookie = req.headers.cookie || "";
  const m = cookie.match(/client_token=([^;]+)/);
  if (!m) return null;
  try {
    const decoded = jwt.verify(m[1], process.env.JWT_SECRET || "secret");
    return decoded.clientId || decoded.id || null;
  } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const clientId = getClientId(req);
  if (!clientId) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();
  const { brandSlug } = req.query;

  const brand = await Brand.findOne({ slug: brandSlug, clientId }).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const campaigns = await AdCampaign.find({ brandId: brand._id })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({ success: true, campaigns });
}
