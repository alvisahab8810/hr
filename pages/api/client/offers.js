// GET /api/client/offers?brandSlug=<slug>
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Offer from "@/models/Offer";
import Brand from "@/models/tasks/Brand";

function getToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const payload = getToken(req);
  if (!payload || payload.role !== "client") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();
  const { brandSlug } = req.query;
  const now = new Date();

  const brand = brandSlug ? await Brand.findOne({ slug: brandSlug }).lean() : null;

  const filters = [
    { isActive: true },
    { validFrom: { $lte: now } },
    { $or: [{ validUntil: { $exists: false } }, { validUntil: null }, { validUntil: { $gte: now } }] },
  ];

  if (brand) {
    filters.push({
      $or: [{ target: "all" }, { target: "specific", brandIds: brand._id }],
    });
  } else {
    filters.push({ target: "all" });
  }

  try {
    const offers = await Offer.find({ $and: filters }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, offers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
