// pages/api/admin/case-studies/index.js — list and create case studies.
//
// Writes into the shared Mongo "casestudies" collection; viralon-new reads it
// in getStaticProps and draws /case-study/<slug>, plus the Case Studies rail on
// its home page. Same arrangement as the FAQ sets next door.
//
// Everything the website renders is plain text or a URL -- no rich text -- so
// sanitising here is a matter of trimming strings and keeping arrays the shape
// the schema promises, rather than the tag-stripping the FAQ answers need.
import dbConnect from "@/utils/dbConnect";
import CaseStudy from "@/models/CaseStudy";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const str = (v) => String(v ?? "").trim();
const bool = (v) => v === true || v === "true";
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Lower case, letters/numbers/dashes only -- this becomes the URL.
export const toSlug = (v) =>
  str(v)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// A URL typed or uploaded by the admin. Anything that is not http(s) or a
// site-relative path is dropped, so "javascript:" can never reach an <img src>.
const url = (v) => {
  const s = str(v);
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || s.startsWith("/")) return s;
  return "";
};

const heading = (h = {}) => ({
  lead: str(h.lead),
  accent: str(h.accent),
  tail: str(h.tail),
});

const arr = (v) => (Array.isArray(v) ? v : []);

const stat = (s = {}) => ({
  value: str(s.value),
  label: str(s.label),
  sub: str(s.sub),
});

const media = (m = {}) => ({
  kind: m.kind === "video" ? "video" : "image",
  image: url(m.image),
  video: url(m.video),
  poster: url(m.poster),
  caption: str(m.caption),
  alt: str(m.alt),
});

const card = (c = {}) => ({
  number: str(c.number),
  kicker: str(c.kicker),
  title: str(c.title),
  body: str(c.body),
  image: url(c.image),
  tone: str(c.tone),
  ctaLabel: str(c.ctaLabel),
  ctaHref: url(c.ctaHref),
});

// The band above a heading, shared by every numbered section.
const base = (s = {}) => ({
  enabled: s.enabled === undefined ? true : bool(s.enabled),
  number: str(s.number),
  label: str(s.label),
  navLabel: str(s.navLabel),
});

// An entry counts as filled if any of its own fields carry something -- empty
// rows the admin left behind are dropped rather than saved as blanks.
const filled = (o) => Object.values(o).some((v) => v !== "" && v !== 0);

export function sanitizeBody(body = {}) {
  const b = body || {};
  return {
    slug: toSlug(b.slug),

    brandName: str(b.brandName),
    brandLogo: url(b.brandLogo),
    category: str(b.category),
    dateLabel: str(b.dateLabel),
    tags: arr(b.tags).map(str).filter(Boolean),

    hero: {
      heading: heading(b.hero?.heading),
      intro: str(b.hero?.intro),
      media: media(b.hero?.media),
      stats: arr(b.hero?.stats).map(stat).filter(filled),
    },

    onThisPage: {
      enabled: b.onThisPage?.enabled === undefined ? true : bool(b.onThisPage.enabled),
      title: str(b.onThisPage?.title) || "ON THIS PAGE",
      ctaLabel: str(b.onThisPage?.ctaLabel) || "LET'S TALK",
      ctaHref: url(b.onThisPage?.ctaHref) || "/contact-us",
    },

    inMotion: {
      ...base(b.inMotion),
      heading: heading(b.inMotion?.heading),
      items: arr(b.inMotion?.items).map(media).filter((m) => m.image || m.video),
    },

    workItself: {
      ...base(b.workItself),
      heading: heading(b.workItself?.heading),
      autoScrollSeconds: num(b.workItself?.autoScrollSeconds),
      items: arr(b.workItself?.items).map(media).filter((m) => m.image || m.video),
    },

    problem: {
      ...base(b.problem),
      heading: heading(b.problem?.heading),
      intro: str(b.problem?.intro),
      cards: arr(b.problem?.cards).map(card).filter(filled),
    },

    approach: {
      ...base(b.approach),
      heading: heading(b.approach?.heading),
      intro: str(b.approach?.intro),
      cards: arr(b.approach?.cards).map(card).filter(filled),
    },

    teams: {
      ...base(b.teams),
      heading: heading(b.teams?.heading),
      intro: str(b.teams?.intro),
      cards: arr(b.teams?.cards).map(card).filter(filled),
    },

    howItRan: {
      ...base(b.howItRan),
      heading: heading(b.howItRan?.heading),
      steps: arr(b.howItRan?.steps).map(card).filter(filled),
    },

    stack: {
      ...base(b.stack),
      heading: heading(b.stack?.heading),
      items: arr(b.stack?.items)
        .map((i) => ({ name: str(i?.name), color: str(i?.color) }))
        .filter((i) => i.name),
    },

    landed: {
      ...base(b.landed),
      heading: heading(b.landed?.heading),
      flow: arr(b.landed?.flow)
        .map((f) => ({ label: str(f?.label), sub: str(f?.sub) }))
        .filter((f) => f.label),
      stats: arr(b.landed?.stats).map(stat).filter(filled),
    },

    home: {
      enabled: b.home?.enabled === undefined ? true : bool(b.home.enabled),
      order: num(b.home?.order),
      heading: heading(b.home?.heading),
      body: str(b.home?.body),
      image: url(b.home?.image),
      ctaLabel: str(b.home?.ctaLabel) || "Read Case Study",
    },

    seo: {
      title: str(b.seo?.title),
      metaDescription: str(b.seo?.metaDescription),
      metaKeywords: str(b.seo?.metaKeywords),
      canonical: url(b.seo?.canonical),
      ogTitle: str(b.seo?.ogTitle),
      ogDescription: str(b.seo?.ogDescription),
      ogImage: url(b.seo?.ogImage),
    },

    status: b.status === "published" ? "published" : "draft",
  };
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      // The list screen only needs enough to draw a row.
      const rows = await CaseStudy.find()
        .select("slug brandName brandLogo category dateLabel status home.order updatedAt")
        .sort({ "home.order": 1, updatedAt: -1 })
        .lean();
      return res.status(200).json({
        success: true,
        data: rows.map((r) => ({ ...r, id: r._id })),
      });
    }

    if (req.method === "POST") {
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
      const clash = await CaseStudy.findOne({ slug: doc.slug }).lean();
      if (clash) {
        return res.status(400).json({
          success: false,
          message: `"/${doc.slug}" is already taken — pick another slug`,
        });
      }
      const created = await CaseStudy.create(doc);
      return res.status(201).json({ success: true, data: created });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
