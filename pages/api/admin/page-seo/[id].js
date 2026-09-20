// pages/api/admin/page-seo/[id].js — one page's SEO record: fetch / update /
// delete. Deleting is safe: the site falls back to the page's own hard-coded
// title and the default robots directives when no record exists.
import dbConnect from "@/utils/dbConnect";
import PageSeo from "@/models/PageSeo";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { SITE_PAGE_KEYS } from "@/utils/sitePages";
import { sanitizeBody } from "./index";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();
  const { id } = req.query;

  try {
    if (req.method === "GET") {
      const doc = await PageSeo.findById(id).lean();
      if (!doc) return res.status(404).json({ success: false, message: "Not found" });
      return res.status(200).json({ success: true, data: { ...doc, id: doc._id } });
    }

    if (req.method === "PUT") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.pageKey || !SITE_PAGE_KEYS.includes(doc.pageKey)) {
        return res.status(400).json({ success: false, message: "Unknown page" });
      }
      // Moving a record onto a page that already has one would break the
      // unique index, so it is caught here with a readable message.
      const clash = await PageSeo.findOne({ pageKey: doc.pageKey, _id: { $ne: id } }).lean();
      if (clash) {
        return res.status(400).json({
          success: false,
          message: `"${doc.pageLabel}" already has an SEO record`,
        });
      }
      const updated = await PageSeo.findByIdAndUpdate(id, doc, { new: true }).lean();
      if (!updated) return res.status(404).json({ success: false, message: "Not found" });
      return res.status(200).json({ success: true, data: { ...updated, id: updated._id } });
    }

    if (req.method === "DELETE") {
      await PageSeo.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
