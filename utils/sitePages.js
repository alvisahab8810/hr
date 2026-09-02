// utils/sitePages.js — the list of viralon.in pages that render the shared FAQ
// block. This drives the "Which page?" dropdown in Website → FAQs and is the
// whitelist the FAQ API validates against.
//
// KEEP IN SYNC with viralon-new: every key here must be mounted on the site as
// <PageFaq pageKey="<key>" … /> (see viralon-new/components/PageFaq.js), else
// the admin can save a set that never shows up anywhere.

export const SITE_PAGES = [
  // ── Main pages ─────────────────────────────────────────────────────────
  { key: "home",        label: "Home",        path: "/",            group: "Main pages" },
  { key: "our-work",    label: "Our Work",    path: "/our-work",    group: "Main pages" },
  { key: "blogs",       label: "Blogs",       path: "/blogs",       group: "Main pages" },
  { key: "career",      label: "Career",      path: "/career",      group: "Main pages" },
  { key: "contact-us",  label: "Contact Us",  path: "/contact-us",  group: "Main pages" },

  // ── Service pages ──────────────────────────────────────────────────────
  { key: "our-services/digital-marketing",     label: "Digital Marketing",     path: "/our-services/digital-marketing",     group: "Service pages" },
  { key: "our-services/social-media-marketing", label: "Social Media Marketing", path: "/our-services/social-media-marketing", group: "Service pages" },
  { key: "our-services/paid-media-marketing",  label: "Paid Media Marketing",  path: "/our-services/paid-media-marketing",  group: "Service pages" },
  { key: "our-services/seo",                   label: "SEO",                   path: "/our-services/seo",                   group: "Service pages" },
  { key: "our-services/brand-identity-design", label: "Brand Identity Design", path: "/our-services/brand-identity-design", group: "Service pages" },
  { key: "our-services/product-packaging",     label: "Product Packaging",     path: "/our-services/product-packaging",     group: "Service pages" },
  { key: "our-services/web-development",       label: "Web Development",       path: "/our-services/web-development",       group: "Service pages" },
  { key: "our-services/email-marketing",       label: "Email Marketing",       path: "/our-services/email-marketing",       group: "Service pages" },
  { key: "our-services/logo-design",           label: "Logo Design",           path: "/our-services/logo-design",           group: "Service pages" },
  { key: "our-services/production",            label: "Production",            path: "/our-services/production",            group: "Service pages" },
];

export const SITE_PAGE_KEYS = SITE_PAGES.map((p) => p.key);

export const SITE_PAGE_GROUPS = SITE_PAGES.reduce((acc, p) => {
  (acc[p.group] = acc[p.group] || []).push(p);
  return acc;
}, {});

export const getSitePage = (key) => SITE_PAGES.find((p) => p.key === key) || null;
