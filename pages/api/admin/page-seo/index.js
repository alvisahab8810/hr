// pages/api/admin/page-seo/index.js — CRUD list/create for per-page SEO.
// Payroll admin writes into the shared Mongo "pageseos" collection;
// viralon-new reads it in getStaticProps (utils/pageSeo.js) and renders the
// meta tags, robots directives and JSON-LD from it.
import dbConnect from "@/utils/dbConnect";
import PageSeo, { DEFAULT_ROBOTS } from "@/models/PageSeo";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { SITE_PAGES, SITE_PAGE_KEYS, getSitePage } from "@/utils/sitePages";

const str = (v) => String(v ?? "").trim();

// Only the fields the editor owns are copied across, so a stray key in the
// request body can never reach the document.
export function sanitizeBody(body = {}) {
  const page = getSitePage(str(body.pageKey));
  return {
    pageKey: page ? page.key : "",
    pageLabel: page ? page.label : "",
    path: page ? page.path : "",
    title: str(body.title),
    metaKeywords: str(body.metaKeywords),
    metaDescription: str(body.metaDescription),
    canonical: str(body.canonical),
    ogTitle: str(body.ogTitle),
    ogDescription: str(body.ogDescription),
    ogImage: str(body.ogImage),
    twitterCard: str(body.twitterCard) || "summary_large_image",
    metaRobots: str(body.metaRobots) || DEFAULT_ROBOTS,
    xRobotsTag: str(body.xRobotsTag) || DEFAULT_ROBOTS,
    // An empty block is dropped rather than stored: the site skips blank
    // JSON-LD anyway, and this keeps the record tidy.
    schemas: (Array.isArray(body.schemas) ? body.schemas : [])
      .map((sc) => ({ type: str(sc?.type) || "WebPage", content: str(sc?.content) }))
      .filter((sc) => sc.content),
    status: body.status === "draft" ? "draft" : "published",
  };
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const docs = await PageSeo.find().sort({ updatedAt: -1 }).lean();
      const used = new Set(docs.map((d) => d.pageKey));
      return res.status(200).json({
        success: true,
        data: docs.map((d) => ({ ...d, id: d._id })),
        // The picker greys out pages that already have a record — the admin
        // edits that one instead of creating a duplicate.
        pages: SITE_PAGES.map((p) => ({ ...p, used: used.has(p.key) })),
      });
    }

    if (req.method === "POST") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.pageKey) {
        return res.status(400).json({ success: false, message: "Pick a page" });
      }
      if (!SITE_PAGE_KEYS.includes(doc.pageKey)) {
        return res.status(400).json({ success: false, message: "Unknown page" });
      }
      const clash = await PageSeo.findOne({ pageKey: doc.pageKey }).lean();
      if (clash) {
        return res.status(400).json({
          success: false,
          message: `"${doc.pageLabel}" already has an SEO record — edit that one instead`,
        });
      }
      const created = await PageSeo.create(doc);
      return res.status(201).json({ success: true, data: created });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
