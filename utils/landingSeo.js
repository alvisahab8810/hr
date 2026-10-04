// utils/landingSeo.js — the SEO half of a page built in the CRM.
//
// Everything a page needs to appear properly in search and when it is pasted
// into a chat: the meta tags, the canonical, the Open Graph and Twitter cards,
// the robots directives (both the tag and the HTTP header) and any number of
// JSON-LD schema blocks. Same set of fields the blog editor has, so a landing
// page is never the weaker page of the two.
//
// KEEP THIS FILE IDENTICAL to viralon-payroll/utils/landingSeo.js. The CRM
// builds its SEO form and cleans what it stores from here; the website reads
// the same descriptors back when it renders the <head>. Plain data and pure
// functions on purpose — no React, no imports — so both repos can hold the
// same copy.

// Canonicals and schema URLs point at the permanent domain, never the staging
// subdomain the site happens to run on today.
export const BASE_URL = "https://viralon.in";

export const DEFAULT_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1";

// The presets the blog and Pages SEO editors offer, so all three behave alike.
export const ROBOTS_PRESETS = [
  ["index, follow", DEFAULT_ROBOTS],
  ["noindex", "noindex, nofollow"],
  ["noarchive", "index, follow, noarchive"],
];

export const TWITTER_CARDS = ["summary_large_image", "summary"];

// Tilted towards the types a marketing page actually uses. FAQPage is in the
// list but a page with questions on it gets one generated anyway.
export const SCHEMA_TYPES = [
  "WebPage", "Service", "Organization", "LocalBusiness", "ProfessionalService",
  "BreadcrumbList", "FAQPage", "Product", "Article", "BlogPosting",
  "NewsArticle", "HowTo", "Event", "Person", "WebSite",
];

/* ── defaults ───────────────────────────────────────────────────────────── */

export const EMPTY_SEO = () => ({
  seoTitle: "",
  seoDescription: "",
  seoKeywords: "",
  canonical: "",
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  twitterCard: "summary_large_image",
  metaRobots: DEFAULT_ROBOTS,
  xRobotsTag: DEFAULT_ROBOTS,
  schemas: [],
});

/* ── cleaning ───────────────────────────────────────────────────────────── */

const str = (v) => String(v ?? "").trim();

// A JSON-LD block is printed into the page as-is, so anything that is not
// valid JSON is dropped here rather than breaking the live page's structured
// data. The CRM checks it too, with a message; this is the backstop.
function cleanSchemaBlock(sc) {
  const type = str(sc?.type) || "WebPage";
  const content = str(sc?.content);
  if (!content) return null;
  try {
    JSON.parse(content);
  } catch {
    return null;
  }
  return { type, content };
}

export function cleanSeo(body = {}) {
  return {
    seoTitle: str(body.seoTitle),
    seoDescription: str(body.seoDescription),
    seoKeywords: str(body.seoKeywords),
    canonical: str(body.canonical),
    ogTitle: str(body.ogTitle),
    ogDescription: str(body.ogDescription),
    ogImage: str(body.ogImage),
    twitterCard: TWITTER_CARDS.includes(body.twitterCard)
      ? body.twitterCard
      : "summary_large_image",
    metaRobots: str(body.metaRobots) || DEFAULT_ROBOTS,
    xRobotsTag: str(body.xRobotsTag) || DEFAULT_ROBOTS,
    schemas: (Array.isArray(body.schemas) ? body.schemas : [])
      .map(cleanSchemaBlock)
      .filter(Boolean),
  };
}

/* ── what the website prints ────────────────────────────────────────────── */

export const absUrl = (v, base = BASE_URL) => {
  const s = str(v);
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : base + (s.startsWith("/") ? s : "/" + s);
};

// Resolve a page into the exact values the <head> needs. Every fallback lives
// here, so the CRM's preview and the live page can never disagree: the CRM
// calls this with the form it is holding, the website with the stored page.
export function resolveSeo(page = {}) {
  const slug = str(page.slug);
  const title = str(page.seoTitle) || str(page.title);
  const description = str(page.seoDescription);
  const url = str(page.canonical) || BASE_URL + "/" + slug;
  const image = absUrl(page.ogImage);
  return {
    title,
    description,
    keywords: str(page.seoKeywords),
    url,
    image,
    ogTitle: str(page.ogTitle) || title,
    ogDescription: str(page.ogDescription) || description,
    twitterCard: str(page.twitterCard) || "summary_large_image",
    metaRobots: str(page.metaRobots) || DEFAULT_ROBOTS,
    xRobotsTag: str(page.xRobotsTag) || DEFAULT_ROBOTS,
    noindex: /noindex/i.test(str(page.metaRobots) || DEFAULT_ROBOTS),
  };
}

// A Pages-SEO record (models/PageSeo.js) in the shape resolveSeo and
// pageSchemas read. The two editors keep the same ten fields under different
// names — the landing builder calls them seoTitle/seoDescription, the Pages
// SEO screen calls them title/metaDescription — and this is the one place
// that knows it, so the home page's head is built by exactly the same code as
// a landing page's.
export function fromPageSeo(doc = {}, path = "/") {
  const d = doc || {};
  return {
    title: str(d.title),
    seoTitle: str(d.title),
    seoDescription: str(d.metaDescription),
    seoKeywords: str(d.metaKeywords),
    canonical: str(d.canonical) || BASE_URL + path,
    ogTitle: str(d.ogTitle),
    ogDescription: str(d.ogDescription),
    ogImage: str(d.ogImage),
    twitterCard: str(d.twitterCard),
    metaRobots: str(d.metaRobots),
    xRobotsTag: str(d.xRobotsTag),
    schemas: Array.isArray(d.schemas) ? d.schemas : [],
  };
}

/* ── schema blocks ──────────────────────────────────────────────────────── */

// Markup down to the one line of text structured data is allowed to carry.
export const toText = (html) =>
  String(html ?? "")
    .replace(/<\/(p|li|ul|ol|div|h[1-6])>|<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const ORG = {
  "@type": "Organization",
  name: "Viralon",
  url: BASE_URL,
  logo: { "@type": "ImageObject", url: BASE_URL + "/assets/img/logo.png" },
};

// Fill a block from whatever the page already holds, so an admin picks a type
// and presses Generate rather than writing JSON-LD by hand. `ctx` is the
// output of resolveSeo plus the page's faqs.
export function buildSchemaJson(type, ctx = {}) {
  const { title: name = "", description = "", url = BASE_URL, image = "" } = ctx;
  const imageObj = image ? { "@type": "ImageObject", url: image } : null;
  const today = new Date().toISOString().slice(0, 10);
  const C = "https://schema.org";

  if (type === "FAQPage") {
    return {
      "@context": C,
      "@type": "FAQPage",
      mainEntity: (ctx.faqs || [])
        .filter((f) => f?.question)
        .map((f) => ({
          "@type": "Question",
          name: str(f.question),
          acceptedAnswer: {
            "@type": "Answer",
            // Google wants the answer as plain text. The stored one may carry
            // a link or a bold word, so the tags come off — the ones that end
            // a block become a space, the rest simply vanish, or a bolded
            // word would end up with a gap before the full stop after it.
            text: toText(f.answer),
          },
        })),
    };
  }

  if (type === "BreadcrumbList") {
    return {
      "@context": C,
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: name || "Page", item: url },
      ],
    };
  }

  if (type === "Organization" || type === "LocalBusiness" || type === "ProfessionalService") {
    return {
      "@context": C,
      ...ORG,
      "@type": type,
      description,
      ...(type === "Organization"
        ? { sameAs: [] }
        : { address: { "@type": "PostalAddress", addressCountry: "IN" } }),
    };
  }

  if (type === "WebSite") {
    return { "@context": C, "@type": "WebSite", name: "Viralon", url: BASE_URL, description };
  }

  if (type === "Service") {
    return {
      "@context": C, "@type": "Service", name, description, url,
      ...(imageObj ? { image: imageObj } : {}),
      provider: ORG,
      areaServed: "IN",
    };
  }

  if (type === "Product") {
    return {
      "@context": C, "@type": "Product", name, description, url,
      ...(imageObj ? { image: imageObj } : {}),
      brand: { "@type": "Brand", name: "Viralon" },
    };
  }

  if (type === "Person") {
    return { "@context": C, "@type": "Person", name: name || "Viralon", url, description };
  }

  if (type === "Event") {
    return {
      "@context": C, "@type": "Event", name, description, url,
      ...(imageObj ? { image: imageObj } : {}),
      startDate: today, endDate: today,
      organizer: ORG,
      eventStatus: C + "/EventScheduled",
    };
  }

  if (type === "HowTo") {
    return {
      "@context": C, "@type": "HowTo", name, description,
      ...(imageObj ? { image: imageObj } : {}),
      step: [],
    };
  }

  if (type === "Article" || type === "BlogPosting" || type === "NewsArticle") {
    return {
      "@context": C, "@type": type,
      headline: name, description, url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      ...(imageObj ? { image: imageObj } : {}),
      author: { "@type": "Organization", name: "Viralon" },
      publisher: ORG,
      datePublished: today, dateModified: today,
    };
  }

  // WebPage, and the fallback for anything else.
  return {
    "@context": C, "@type": type || "WebPage",
    name, description, url,
    ...(imageObj ? { primaryImageOfPage: imageObj } : {}),
    isPartOf: { "@type": "WebSite", name: "Viralon", url: BASE_URL },
    publisher: ORG,
  };
}

const hasType = (schemas, type) =>
  (schemas || []).some(
    (sc) => new RegExp('"@type"\\s*:\\s*"' + type + '"', "i").test(sc?.content || "")
  );

// What the page ends up printing: the blocks the admin wrote, plus the two a
// page should never be missing. A WebPage block is added when there is no
// schema at all, and a FAQPage block is generated from the questions actually
// on the page — asking an admin to keep hand-written JSON-LD in step with the
// FAQ band they just edited is how structured data goes stale.
export function pageSchemas(page = {}, faqs = []) {
  const stored = (page.schemas || []).filter((sc) => str(sc?.content));
  const ctx = { ...resolveSeo(page), faqs };
  const out = stored.map((sc) => sc.content);

  if (!stored.length) {
    out.push(JSON.stringify(buildSchemaJson("WebPage", ctx)));
  }
  if (faqs.filter((f) => f?.question).length && !hasType(stored, "FAQPage")) {
    out.push(JSON.stringify(buildSchemaJson("FAQPage", ctx)));
  }
  return out;
}
