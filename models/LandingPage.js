// models/LandingPage.js — SEO landing pages built from the payroll admin
// (Website → SEO Pages) and rendered by viralon-new at /<slug> via its
// root-level catch-all route. Static site pages always win over the
// catch-all, so these can never shadow an existing page.
// IMPORTANT: keep this schema identical to viralon-new/models/LandingPage.js —
// both apps share the same Mongo "landingpages" collection (payroll writes,
// website reads).

import mongoose from "mongoose";

// Explicit subdocument schema: a field named "type" would otherwise be read as
// a discriminator key and blow up on $set (same trick as models/Blog.js).
const SchemaBlockSchema = new mongoose.Schema(
  {
    type: { type: String, default: "WebPage" },
    content: { type: String, default: "" },
  },
  { _id: false }
);

const LandingPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },              // internal name + H1 fallback
    slug: { type: String, required: true, unique: true }, // URL path: viralon.in/<slug>
    template: { type: String, required: true, default: "spotlight" }, // key from the template registry

    // SEO meta. The same set the blog editor has — see utils/landingSeo.js,
    // which owns the defaults, the cleaning and every fallback the <head>
    // uses, in both repos.
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    seoKeywords: { type: String, default: "" },
    canonical: { type: String, default: "" },

    // Open Graph / Twitter: what a pasted link turns into.
    ogTitle: { type: String, default: "" },
    ogDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    twitterCard: { type: String, default: "summary_large_image" },

    // Robots directives. Both default to the same value, which is what the
    // site sends for a page that has never been edited.
    metaRobots: { type: String, default: "index, follow, max-image-preview:large, max-snippet:-1" },
    xRobotsTag: { type: String, default: "index, follow, max-image-preview:large, max-snippet:-1" },

    // JSON-LD blocks, printed into the page in order. A page with questions
    // on it also gets a generated FAQPage block, so that one is not stored.
    schemas: { type: [SchemaBlockSchema], default: [] },

    // Per-template content object (hero, intro, features, stats, gallery,
    // faqs, quote, closing, showLeadForm…). Shape documented in
    // utils/landingTemplates.js (payroll) / components/landing (website).
    content: { type: mongoose.Schema.Types.Mixed, default: {} },

    status: { type: String, enum: ["draft", "published"], default: "draft" },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// In dev, hot reloads can leave a stale compiled model (old schema) cached on
// the mongoose global — drop it so schema edits always take effect without a
// server restart.
if (process.env.NODE_ENV !== "production" && mongoose.models.LandingPage) {
  delete mongoose.models.LandingPage;
}

export default mongoose.models.LandingPage || mongoose.model("LandingPage", LandingPageSchema);
