// pages/api/admin/faqs/index.js — CRUD for the per-page FAQ sets.
// Payroll admin writes into the shared Mongo "pagefaqs" collection;
// viralon-new reads it in getStaticProps and renders <PageFaq /> with the
// exact same markup the old hard-coded FAQ components used.
import dbConnect from "@/utils/dbConnect";
import PageFaq from "@/models/PageFaq";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { SITE_PAGES, SITE_PAGE_KEYS, getSitePage } from "@/utils/sitePages";

const str = (v) => String(v ?? "").trim();

// The answer editor emits HTML. It ends up in dangerouslySetInnerHTML on the
// website, so keep only the tags the toolbar can produce and drop every
// attribute except a safe href/target/rel on links.
const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "a",
]);

export function sanitizeAnswer(input) {
  let html = String(input ?? "");

  // Kill script/style/iframe blocks outright (tag + contents).
  html = html.replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, "");

  html = html.replace(/<\/?([a-zA-Z0-9-]+)((?:\s[^>]*)?)\/?>/g, (full, tag, attrs) => {
    const name = tag.toLowerCase();
    if (!ALLOWED_TAGS.has(name)) return ""; // unwrap: keep the text, drop the tag
    if (full.startsWith("</")) return `</${name}>`;
    if (name !== "a") return name === "br" ? "<br />" : `<${name}>`;

    // <a>: keep a non-javascript href, force safe rel/target for externals.
    const m = /\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs || "");
    let href = str(m ? m[2] ?? m[3] ?? m[4] : "");
    if (/^\s*(javascript|data|vbscript):/i.test(href)) href = "";
    if (!href) return "<a>";
    const external = /^https?:\/\//i.test(href) && !/viralon\.in/i.test(href);
    const escaped = href.replace(/"/g, "&quot;");
    return external
      ? `<a href="${escaped}" target="_blank" rel="noopener noreferrer">`
      : `<a href="${escaped}">`;
  });

  // "Visually empty" markup (e.g. "<p></p>") counts as no answer.
  if (!html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()) return "";
  return html.trim();
}

export function sanitizeBody(body = {}) {
  const page = getSitePage(str(body.pageKey));
  return {
    pageKey: page ? page.key : "",
    pageLabel: page ? page.label : "",
    kicker: str(body.kicker),
    heading: str(body.heading),
    footerText: str(body.footerText),
    items: (Array.isArray(body.items) ? body.items : [])
      .map((it) => ({ question: str(it?.question), answer: sanitizeAnswer(it?.answer) }))
      .filter((it) => it.question || it.answer),
    status: body.status === "draft" ? "draft" : "published",
  };
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const sets = await PageFaq.find().sort({ updatedAt: -1 }).lean();
      const used = new Set(sets.map((s) => s.pageKey));
      return res.status(200).json({
        success: true,
        data: sets.map((s) => ({ ...s, id: s._id })),
        // The dropdown greys out pages that already have a set — the admin
        // edits or deletes the existing one instead of creating a duplicate.
        pages: SITE_PAGES.map((p) => ({ ...p, used: used.has(p.key) })),
      });
    }

    if (req.method === "POST") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.pageKey) {
        return res.status(400).json({ success: false, message: "Pick a page for this FAQ set" });
      }
      if (!SITE_PAGE_KEYS.includes(doc.pageKey)) {
        return res.status(400).json({ success: false, message: "Unknown page" });
      }
      if (!doc.items.length) {
        return res.status(400).json({ success: false, message: "Add at least one question" });
      }
      const clash = await PageFaq.findOne({ pageKey: doc.pageKey }).lean();
      if (clash) {
        return res.status(400).json({
          success: false,
          message: `"${doc.pageLabel}" already has an FAQ set — edit that one instead`,
        });
      }
      const created = await PageFaq.create(doc);
      return res.status(201).json({ success: true, data: created });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
