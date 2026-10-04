// utils/pageSchemas/index.js — which site pages are editable, and with what.
//
// KEEP IDENTICAL between viralon-new and viralon-payroll.
//
// Every page in the header menu that has its own hand-built layout is listed
// here with the schema that describes it. The website reads the schema to
// render the page's bands; the CRM reads this list to fill its page picker and
// the schema to draw the form. A page added here needs nothing else on either
// side beyond its own schema file and its bands component.
//
// The home page is not in this list: it has its own record and its own screen
// (utils/homeSchema.js, Website → Pages → Home page).
import brand from "./brand";
import search from "./search";
import socialContent from "./socialContent";
import paidAds from "./paidAds";
import websiteAndCro from "./websiteAndCro";
import analyticsAndTracking from "./analyticsAndTracking";

export const PAGE_CONTENT = [
  {
    key: "brand", label: "Brand", path: "/brand", icon: "bi-palette-fill",
    about: "The live /brand page, band by band — every word, photo and figure in it.",
    seoPlaceholder: "Brand & Identity Design | Viralon",
    schema: brand,
  },
  {
    key: "search", label: "Search", path: "/search", icon: "bi-search",
    about: "The live /search page, band by band — every word, photo and figure in it.",
    seoPlaceholder: "SEO & Search | Viralon",
    schema: search,
  },
  {
    key: "social-content", label: "Social Content", path: "/social-content", icon: "bi-chat-square-text-fill",
    about: "The live /social-content page, band by band — every word, photo and figure in it.",
    seoPlaceholder: "Social Media & Content | Viralon",
    schema: socialContent,
  },
  {
    key: "paid-ads", label: "Paid Ads", path: "/paid-ads", icon: "bi-megaphone-fill",
    about: "The live /paid-ads page, band by band — every word, photo and figure in it.",
    seoPlaceholder: "Paid Ads Management | Viralon",
    schema: paidAds,
  },
  {
    key: "website-and-cro", label: "Website & CRO", path: "/website-and-cro", icon: "bi-window-fullscreen",
    about: "The live /website-and-cro page, band by band — every word, photo and figure in it.",
    seoPlaceholder: "Website Design & CRO | Viralon",
    schema: websiteAndCro,
  },
  {
    key: "analytics-and-tracking", label: "Analytics & Tracking", path: "/analytics-and-tracking", icon: "bi-graph-up-arrow",
    about: "The live /analytics-and-tracking page, band by band — every word, photo and figure in it.",
    seoPlaceholder: "Analytics & Tracking | Viralon",
    schema: analyticsAndTracking,
  },
];

export const PAGE_CONTENT_MAP = PAGE_CONTENT.reduce((m, p) => ((m[p.key] = p), m), {});
export const PAGE_CONTENT_KEYS = PAGE_CONTENT.map((p) => p.key);

export const schemaFor = (key) => PAGE_CONTENT_MAP[key]?.schema || null;
