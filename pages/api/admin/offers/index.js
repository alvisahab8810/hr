import dbConnect from "@/utils/dbConnect";
import Offer from "@/models/Offer";
import "@/models/tasks/Brand";

function adminGuard(req, res) {
  if (!(req.headers.cookie || "").includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  if (req.method === "GET") {
    try {
      const offers = await Offer.find({})
        .populate("brandIds", "name color slug")
        .sort({ createdAt: -1 })
        .lean();
      return res.json({ success: true, offers });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { title, description, tag, target, brandIds, ctaText, ctaUrl, validFrom, validUntil, isActive } = req.body;
      if (!title?.trim() || !description?.trim()) {
        return res.status(400).json({ success: false, message: "Title and description are required" });
      }
      const offer = await Offer.create({
        title:       title.trim(),
        description: description.trim(),
        tag:         tag || "Announcement",
        target:      target || "all",
        brandIds:    target === "specific" ? (brandIds || []) : [],
        ctaText:     ctaText?.trim() || "",
        ctaUrl:      ctaUrl?.trim() || "",
        validFrom:   validFrom ? new Date(validFrom) : new Date(),
        validUntil:  validUntil ? new Date(validUntil) : undefined,
        isActive:    isActive !== false,
      });
      const populated = await Offer.findById(offer._id).populate("brandIds", "name color slug").lean();
      return res.json({ success: true, offer: populated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
