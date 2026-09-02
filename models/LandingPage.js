// models/LandingPage.js — SEO landing pages built from the payroll admin
// (Website → SEO Pages) and rendered by viralon-new at /<slug> via its
// root-level catch-all route. Static site pages always win over the
// catch-all, so these can never shadow an existing page.
// IMPORTANT: keep this schema identical to viralon-new/models/LandingPage.js —
// both apps share the same Mongo "landingpages" collection (payroll writes,
// website reads).

import mongoose from "mongoose";

const LandingPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },              // internal name + H1 fallback
    slug: { type: String, required: true, unique: true }, // URL path: viralon.in/<slug>
    template: { type: String, required: true, default: "spotlight" }, // key from the template registry

    // SEO meta
    seoTitle: { type: String, default: "" },
    seoDescription: { type: String, default: "" },
    seoKeywords: { type: String, default: "" },

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
