// pages/api/admin/faqs/[id].js — read / update / delete one page FAQ set.
import dbConnect from "@/utils/dbConnect";
import PageFaq from "@/models/PageFaq";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { SITE_PAGE_KEYS } from "@/utils/sitePages";
import { sanitizeBody } from "./index";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  try {
    const existing = await PageFaq.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "FAQ set not found" });
    }

    if (req.method === "GET") {
      return res.status(200).json({ success: true, data: existing });
    }

    if (req.method === "PUT") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.pageKey || !SITE_PAGE_KEYS.includes(doc.pageKey)) {
        return res.status(400).json({ success: false, message: "Pick a page for this FAQ set" });
      }
      if (!doc.items.length) {
        return res.status(400).json({ success: false, message: "Add at least one question" });
      }
      // Moving a set to another page is allowed, but only if that page is free.
      if (doc.pageKey !== existing.pageKey) {
        const clash = await PageFaq.findOne({ pageKey: doc.pageKey, _id: { $ne: existing._id } }).lean();
        if (clash) {
          return res.status(400).json({
            success: false,
            message: `"${doc.pageLabel}" already has an FAQ set — edit that one instead`,
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
