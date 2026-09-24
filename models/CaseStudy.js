// models/CaseStudy.js — one document per case study, edited here (Website →
// Case Studies) and rendered by the website at /case-study/<slug>.
//
// IMPORTANT: keep this schema identical to viralon-new/models/CaseStudy.js
// — both apps share the same Mongo "casestudies" collection (payroll writes,
// website reads). Same arrangement as PageFaq and PageSeo.
//
// The page is a stack of numbered sections, and every one of them is editable:
// its number, its label, its heading and its cards. A section with `enabled`
// false is skipped by the page and drops out of the "On this page" rail, so the
// admin can turn a section off without losing what is written in it.
//
// Media (`.image`, `.video`, `.poster`) holds a URL. Uploads from the admin
// land on the payroll server and come back as absolute hq.viralon.in URLs, so
// anything already absolute is used as-is and a legacy "/uploads/…" value still
// resolves against whichever origin serves it.

import mongoose from "mongoose";

/* ---- small repeated shapes ------------------------------------------- */

// A heading is written in three pieces so the accent colour can land mid
// sentence -- "Fix The Machine Before " + "Turning Up The Volume." -- which is
// how every heading on the site is drawn.
const HeadingSchema = new mongoose.Schema(
  {
    lead: { type: String, default: "" },
    accent: { type: String, default: "" },
    tail: { type: String, default: "" },
  },
  { _id: false }
);

// The band that sits above a heading: "05 / THE PROBLEM".
const sectionBase = () => ({
  enabled: { type: Boolean, default: true },
  number: { type: String, default: "" },
  label: { type: String, default: "" },
  // What the "On this page" rail calls this section. Empty falls back to
  // `label`, so most of the time nobody has to fill it in.
  navLabel: { type: String, default: "" },
});

const StatSchema = new mongoose.Schema(
  {
    value: { type: String, default: "" },
    label: { type: String, default: "" },
    sub: { type: String, default: "" },
  },
  { _id: false }
);

const MediaSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["image", "video"], default: "image" },
    // For kind "video" this is the file; `poster` is the still shown before it
    // plays. For "image" only `image` is read.
    image: { type: String, default: "" },
    video: { type: String, default: "" },
    poster: { type: String, default: "" },
    caption: { type: String, default: "" },
    alt: { type: String, default: "" },
  },
  { _id: false }
);

const CardSchema = new mongoose.Schema(
  {
    number: { type: String, default: "" },
    kicker: { type: String, default: "" },
    title: { type: String, default: "" },
    // Plain text, not HTML -- these are short paragraphs inside a card.
    body: { type: String, default: "" },
    image: { type: String, default: "" },
    // Lets the admin pick the card's ground where the design uses more than
    // one (the approach cards run dark / purple / light).
    tone: { type: String, default: "" },
    ctaLabel: { type: String, default: "" },
    ctaHref: { type: String, default: "" },
  },
  { _id: false }
);

/* ---- the page, section by section ------------------------------------ */

const CaseStudySchema = new mongoose.Schema(
  {
    // The URL: /case-study/<slug>.
    slug: { type: String, required: true, unique: true, index: true, trim: true },

    // Identity strip at the very top of the hero, and the same fields the home
    // page's Case Studies rail reads for its logo row.
    brandName: { type: String, default: "" },
    brandLogo: { type: String, default: "" },
    category: { type: String, default: "" },
    dateLabel: { type: String, default: "" },
    // The small pills beside the brand name -- "CRO", "2023", "Sales CRM"…
    tags: { type: [String], default: [] },

    /* Hero --------------------------------------------------------------- */
    hero: {
      heading: { type: HeadingSchema, default: () => ({}) },
      intro: { type: String, default: "" },
      media: { type: MediaSchema, default: () => ({}) },
      stats: { type: [StatSchema], default: [] },
    },

    /* The sticky rail on the right. Built from the enabled sections, with the
       button at its foot editable here. */
    onThisPage: {
      enabled: { type: Boolean, default: true },
      title: { type: String, default: "ON THIS PAGE" },
      ctaLabel: { type: String, default: "LET'S TALK" },
      ctaHref: { type: String, default: "/contact-us" },
    },

    /* "07 / IN MOTION" — the small grid of stills and clips. */
    inMotion: {
      ...sectionBase(),
      heading: { type: HeadingSchema, default: () => ({}) },
      items: { type: [MediaSchema], default: [] },
    },

    /* "08 / THE WORK ITSELF" — the rail that scrolls on its own. */
    workItself: {
      ...sectionBase(),
      heading: { type: HeadingSchema, default: () => ({}) },
      // Seconds a card stays before the rail advances. 0 stops the autoplay.
      autoScrollSeconds: { type: Number, default: 4 },
      items: { type: [MediaSchema], default: [] },
    },

    /* "05 / THE PROBLEM" */
    problem: {
      ...sectionBase(),
      heading: { type: HeadingSchema, default: () => ({}) },
      intro: { type: String, default: "" },
      cards: { type: [CardSchema], default: [] },
    },

    /* "06 / OUR APPROACH" */
    approach: {
      ...sectionBase(),
      heading: { type: HeadingSchema, default: () => ({}) },
      intro: { type: String, default: "" },
      cards: { type: [CardSchema], default: [] },
    },

    /* The light band — "Five Works Teams, One Accountable Team." */
    teams: {
      ...sectionBase(),
      heading: { type: HeadingSchema, default: () => ({}) },
      intro: { type: String, default: "" },
      cards: { type: [CardSchema], default: [] },
    },

    /* "02 / HOW IT RAN" — the numbered timeline. */
    howItRan: {
      ...sectionBase(),
      heading: { type: HeadingSchema, default: () => ({}) },
      steps: { type: [CardSchema], default: [] },
    },

    /* "09 / STACK" — the row of folder cards. */
    stack: {
      ...sectionBase(),
      heading: { type: HeadingSchema, default: () => ({}) },
      items: {
        type: [
          new mongoose.Schema(
            {
              name: { type: String, default: "" },
              // Any CSS colour: the card's ground. Empty falls back to the
              // section's default dark.
              color: { type: String, default: "" },
              // Optional logo drawn under the name, as the design shows.
              image: { type: String, default: "" },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
    },

    /* "10 / WHERE IT LANDED" — the orange closing band. */
    landed: {
      ...sectionBase(),
      heading: { type: HeadingSchema, default: () => ({}) },
      // The arrow chain: Search and social → Website → CRM → CRO log.
      flow: {
        type: [
          new mongoose.Schema(
            {
              label: { type: String, default: "" },
              sub: { type: String, default: "" },
            },
            { _id: false }
          ),
        ],
        default: [],
      },
      stats: { type: [StatSchema], default: [] },
    },

    /* What the home page's Case Studies rail shows for this study. Kept here
       rather than in its own collection so one admin screen edits both. */
    home: {
      enabled: { type: Boolean, default: true },
      order: { type: Number, default: 0 },
      heading: { type: HeadingSchema, default: () => ({}) },
      body: { type: String, default: "" },
      image: { type: String, default: "" },
      ctaLabel: { type: String, default: "Read Case Study" },
    },

    /* Per-study head tags. The shared "pageseos" collection is keyed on a
       fixed route, which a slug page cannot use, so SEO rides along here. */
    seo: {
      title: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      metaKeywords: { type: String, default: "" },
      canonical: { type: String, default: "" },
      ogTitle: { type: String, default: "" },
      ogDescription: { type: String, default: "" },
      ogImage: { type: String, default: "" },
    },

    status: { type: String, enum: ["draft", "published"], default: "draft" },
  },
  { timestamps: true }
);

// In dev, hot reloads can leave a stale compiled model cached on the mongoose
// global — drop it so schema edits always take effect.
if (process.env.NODE_ENV !== "production" && mongoose.models.CaseStudy) {
  delete mongoose.models.CaseStudy;
}

export default mongoose.models.CaseStudy ||
  mongoose.model("CaseStudy", CaseStudySchema);
