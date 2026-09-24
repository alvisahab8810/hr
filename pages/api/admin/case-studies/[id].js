// pages/api/admin/case-studies/[id].js — read / update / delete one case study.
import dbConnect from "@/utils/dbConnect";
import CaseStudy from "@/models/CaseStudy";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { sanitizeBody } from "./index";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  try {
    const existing = await CaseStudy.findById(id);
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Case study not found" });
    }

    if (req.method === "GET") {
      return res.status(200).json({ success: true, data: existing });
    }

    if (req.method === "PUT") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.slug) {
        return res
          .status(400)
          .json({ success: false, message: "Give this case study a URL slug" });
      }
      if (!doc.brandName) {
        return res
          .status(400)
          .json({ success: false, message: "Give this case study a brand name" });
      }
      // Renaming the slug is allowed, but only onto a free one -- the old URL
      // stops working, so the admin is told rather than silently redirected.
      if (doc.slug !== existing.slug) {
        const clash = await CaseStudy.findOne({
          slug: doc.slug,
          _id: { $ne: existing._id },
        }).lean();
        if (clash) {
          return res.status(400).json({
            success: false,
            message: `"/${doc.slug}" is already taken — pick another slug`,
          });
        }
      }
      Object.assign(existing, doc);
      await existing.save();
      return res.status(200).json({ success: true, data: existing });
    }

    if (req.method === "DELETE") {
      await existing.deleteOne();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
