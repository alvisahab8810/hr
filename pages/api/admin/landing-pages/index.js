// pages/api/admin/landing-pages/index.js — CRUD for SEO landing pages.
// Payroll admin writes into the shared Mongo "landingpages" collection;
// viralon-new renders published ones at /<slug> via its root catch-all.
import dbConnect from "@/utils/dbConnect";
import LandingPage from "@/models/LandingPage";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { TEMPLATE_KEYS, SECTION_TYPES } from "@/utils/landingTemplates";

export function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s/-]/g, "")
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Slugs that would collide with (or be shadowed by) real website routes.
// Static pages always beat the catch-all, so a page saved under one of these
// would silently never render — block them up-front with a clear error.
export const RESERVED_SLUGS = new Set([
  "", "index", "api", "assets", "_next", "favicon.ico",
  "jobs", "career", "careers", "blogs", "single-blogs", "contact-us",
  "our-work", "our-services", "thank-you", "your-brands-bff",
  "editor", "test", "posts", "dashboard", "employee", "admin", "login",
  "landing-preview",
]);

const str = (v) => String(v ?? "").trim();

// Rich-text HTML from the admin editor: collapse "visually empty" markup
// (e.g. "<p></p>") to "" so the website hides the section.
function richField(v) {
  const html = str(v);
  if (!html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()) return "";
  return html;
}

// v2 content shape: { hero: {...}, sections: [{type, data}…], showLeadForm }.
// Each section's data is cleaned by type; empty rows are dropped, and a
// section left with no content at all is removed entirely.
function sanitizeSection(sec) {
  if (!sec || typeof sec !== "object" || !SECTION_TYPES[sec.type]) return null;
  const d = sec.data && typeof sec.data === "object" ? sec.data : {};
  let data;
  switch (sec.type) {
    case "intro":
      data = { heading: str(d.heading), html: richField(d.html) };
      if (!data.heading && !data.html) return null;
      break;
    case "split":
      data = {
        heading: str(d.heading), html: richField(d.html),
        image: str(d.image), reverse: d.reverse === true || d.reverse === "true",
      };
      if (!data.heading && !data.html && !data.image) return null;
      break;
    case "features":
      data = {
        heading: str(d.heading), subheading: str(d.subheading),
        items: (Array.isArray(d.items) ? d.items : [])
          .map((f) => ({ title: str(f?.title), text: str(f?.text), image: str(f?.image) }))
          .filter((f) => f.title || f.text),
      };
      if (!data.items.length) return null;
      break;
    case "process":
      data = {
        heading: str(d.heading),
        steps: (Array.isArray(d.steps) ? d.steps : [])
          .map((s) => ({ title: str(s?.title), text: str(s?.text), icon: str(s?.icon) }))
          .filter((s) => s.title || s.text),
      };
      if (!data.steps.length) return null;
      break;
    case "stats":
      data = {
        heading: str(d.heading),
        items: (Array.isArray(d.items) ? d.items : [])
          .map((s) => ({ value: str(s?.value), label: str(s?.label) }))
          .filter((s) => s.value || s.label),
      };
      if (!data.items.length) return null;
      break;
    case "gallery":
    case "logos":
      data = {
        heading: str(d.heading),
        images: (Array.isArray(d.images) ? d.images : []).map((g) => str(g)).filter(Boolean),
      };
      if (!data.images.length) return null;
      break;
    case "reviews":
      data = {
        heading: str(d.heading),
        items: (Array.isArray(d.items) ? d.items : [])
          .map((r) => ({
            text: str(r?.text), name: str(r?.name), role: str(r?.role),
            rating: Math.min(5, Math.max(1, Number(r?.rating) || 5)),
            image: str(r?.image),
          }))
          .filter((r) => r.text || r.name),
      };
      if (!data.items.length) return null;
      break;
    case "faqs":
      data = {
        heading: str(d.heading),
        items: (Array.isArray(d.items) ? d.items : [])
          .map((f) => ({ q: str(f?.q), a: str(f?.a) }))
          .filter((f) => f.q || f.a),
      };
      if (!data.items.length) return null;
      break;
    case "cta":
      data = {
        headline: str(d.headline), text: str(d.text),
        ctaText: str(d.ctaText), ctaLink: str(d.ctaLink),
      };
      if (!data.headline && !data.text && !data.ctaText) return null;
      break;
    case "strap":
      data = {
        items: (Array.isArray(d.items) ? d.items : []).map((w) => str(w)).filter(Boolean),
      };
      if (!data.items.length) return null;
      break;
    case "benefits":
      data = {
        heading: str(d.heading), text: str(d.text),
        items: (Array.isArray(d.items) ? d.items : [])
          .map((b) => ({ title: str(b?.title), text: str(b?.text) }))
          .filter((b) => b.title || b.text),
      };
      if (!data.items.length) return null;
      break;
    case "whychoose":
      data = {
        kicker: str(d.kicker), heading: str(d.heading), brand: str(d.brand),
        items: (Array.isArray(d.items) ? d.items : [])
          .map((r) => ({ title: str(r?.title), text: str(r?.text) }))
          .filter((r) => r.title || r.text),
        images: (Array.isArray(d.images) ? d.images : []).map((g) => str(g)).filter(Boolean),
      };
      if (!data.items.length) return null;
      break;
    case "blogs":
      data = {
        heading: str(d.heading), text: str(d.text),
        items: (Array.isArray(d.items) ? d.items : [])
          .map((b) => ({
            title: str(b?.title), text: str(b?.text),
            image: str(b?.image), date: str(b?.date), link: str(b?.link),
          }))
          .filter((b) => b.title || b.text),
      };
      if (!data.items.length) return null;
      break;
    default:
      return null;
  }
  return { type: sec.type, data };
}

function sanitizeContent(c = {}) {
  const hero = c.hero && typeof c.hero === "object" ? c.hero : {};
  const sections = (Array.isArray(c.sections) ? c.sections : [])
    .map(sanitizeSection)
    .filter(Boolean);
  return {
    hero: {
      kicker: str(hero.kicker),
      headline: str(hero.headline),
      headlineAccent: str(hero.headlineAccent),
      subheadline: str(hero.subheadline),
      heroImage: str(hero.heroImage),
      ctaText: str(hero.ctaText),
      ctaLink: str(hero.ctaLink),
    },
    sections,
    showLeadForm: c.showLeadForm !== false && c.showLeadForm !== "false",
  };
}

export function sanitizeBody(body) {
  return {
    title: str(body.title),
    template: TEMPLATE_KEYS.includes(body.template) ? body.template : TEMPLATE_KEYS[0],
    seoTitle: str(body.seoTitle),
    seoDescription: str(body.seoDescription),
    seoKeywords: str(body.seoKeywords),
    content: sanitizeContent(body.content || {}),
    status: body.status === "published" ? "published" : "draft",
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
  };
}

// Resolve the final slug: the admin's custom slug wins, else the title.
// Returns { slug } or { error }.
export async function resolveSlug(rawSlug, title, excludeId) {
  const base = slugify(rawSlug) || slugify(title);
  if (!base) return { error: "URL slug is required" };
  if (RESERVED_SLUGS.has(base)) {
    return { error: `"/${base}" is an existing website page — pick a different URL` };
  }
  let slug = base;
  let n = 2;
  // Append -2, -3… until the slug is free.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await LandingPage.findOne(
      excludeId ? { slug, _id: { $ne: excludeId } } : { slug }
    ).lean();
    if (!clash) return { slug };
    slug = `${base}-${n++}`;
  }
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const pages = await LandingPage.find().sort({ order: 1, createdAt: -1 }).lean();
      return res.status(200).json({ success: true, data: pages.map((p) => ({ ...p, id: p._id })) });
    }

    if (req.method === "POST") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.title) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }
      const resolved = await resolveSlug(req.body?.slug, doc.title);
      if (resolved.error) {
        return res.status(400).json({ success: false, message: resolved.error });
      }
      doc.slug = resolved.slug;
      const created = await LandingPage.create(doc);
      return res.status(201).json({ success: true, data: created });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
