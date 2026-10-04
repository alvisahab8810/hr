// pages/api/admin/site-page/index.js — one menu page's content.
//
// The same shape as the home page's endpoint, but for the pages in the header
// menu: one document per page in the shared Mongo "sitepages" collection,
// addressed by its key. viralon-new reads it in that page's file and renders
// the bands in the order stored here.
//
//   GET    /api/admin/site-page?pageKey=brand  → the bands, saved or shipped
//   PUT    /api/admin/site-page               → save them
//   DELETE /api/admin/site-page?pageKey=brand → back to the shipped bands
//
// Everything stored is walked against utils/pageSchemas/<page>.js — the same
// descriptors the website renders from — so an undeclared band or a field the
// website does not know about cannot be written.
import dbConnect from "@/utils/dbConnect";
import SitePage from "@/models/SitePage";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { schemaFor } from "@/utils/pageSchemas";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const pageKey = String(req.query.pageKey || req.body?.pageKey || "").trim();
  const schema = schemaFor(pageKey);
  if (!schema) {
    return res.status(400).json({ success: false, message: "That page is not editable" });
  }

  try {
    if (req.method === "GET") {
      const doc = await SitePage.findOne({ key: pageKey }).lean();
      // Nothing saved yet: hand back the shipped bands so the editor opens on
      // the page as it currently reads, rather than on an empty list.
      return res.status(200).json({
        success: true,
        data: {
          sections: doc?.sections?.length ? doc.sections : schema.defaultSections(),
          saved: Boolean(doc?.sections?.length),
          updatedAt: doc?.updatedAt || null,
        },
      });
    }

    if (req.method === "PUT") {
      const sections = schema.cleanSections(req.body?.sections);
      if (!sections.length) {
        return res
          .status(400)
          .json({ success: false, message: "The page needs at least one band" });
      }
      const doc = await SitePage.findOneAndUpdate(
        { key: pageKey },
        { $set: { key: pageKey, sections } },
        { new: true, upsert: true }
      ).lean();
      return res.status(200).json({ success: true, data: { sections: doc.sections } });
    }

    if (req.method === "DELETE") {
      // Back to the bands as the site ships them. The record is removed rather
      // than overwritten, so the website falls through to the copy written in
      // each component.
      await SitePage.deleteOne({ key: pageKey });
      return res.status(200).json({ success: true, data: { sections: schema.defaultSections() } });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
