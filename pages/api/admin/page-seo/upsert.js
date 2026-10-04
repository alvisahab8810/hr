// pages/api/admin/page-seo/upsert.js — one page's SEO record, by its page key.
//
// Website → Pages SEO is a list screen: it creates records with POST / and
// edits them by id. A screen that owns a single page (Website → Pages → Home
// page) does not know that id and should not have to look it up, so this is
// the same record addressed the way that screen thinks of it:
//
//   GET  /api/admin/page-seo/upsert?pageKey=home   → the record, or null
//   PUT  /api/admin/page-seo/upsert               → create it or update it
//
// Same collection and the same sanitiser as the list screen, so a page edited
// here and a page edited there cannot end up with different rules.
import dbConnect from "@/utils/dbConnect";
import PageSeo from "@/models/PageSeo";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { SITE_PAGE_KEYS } from "@/utils/sitePages";
import { sanitizeBody } from "./index";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const pageKey = String(req.query.pageKey || "").trim();
      if (!SITE_PAGE_KEYS.includes(pageKey)) {
        return res.status(400).json({ success: false, message: "Unknown page" });
      }
      const doc = await PageSeo.findOne({ pageKey }).lean();
      return res.status(200).json({ success: true, data: doc ? { ...doc, id: doc._id } : null });
    }

    if (req.method === "PUT") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.pageKey || !SITE_PAGE_KEYS.includes(doc.pageKey)) {
        return res.status(400).json({ success: false, message: "Unknown page" });
      }
      const saved = await PageSeo.findOneAndUpdate(
        { pageKey: doc.pageKey },
        { $set: doc },
        { new: true, upsert: true }
      ).lean();
      return res.status(200).json({ success: true, data: { ...saved, id: saved._id } });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
