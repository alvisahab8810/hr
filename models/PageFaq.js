// models/PageFaq.js — one FAQ set per website page, edited from the payroll
// admin (Website → FAQs) and rendered by viralon-new's <PageFaq pageKey="…" />
// in place of the old hard-coded FAQ components.
// IMPORTANT: keep this schema identical to viralon-new/models/PageFaq.js —
// both apps share the same Mongo "pagefaqs" collection (payroll writes,
// website reads).

import mongoose from "mongoose";

const FaqItemSchema = new mongoose.Schema(
  {
    question: { type: String, default: "" },
    // HTML from the admin rich-text editor (bold / italic / lists / links),
    // rendered into the accordion body.
    answer: { type: String, default: "" },
  },
  { _id: false }
);

const PageFaqSchema = new mongoose.Schema(
  {
    // Route key from utils/sitePages.js — "home", "our-services/seo",
    // "contact-us"… One FAQ set per page, hence the unique index.
    pageKey: { type: String, required: true, unique: true, index: true },
    pageLabel: { type: String, default: "" }, // snapshot for the admin list

    // The three fixed bits of copy around the accordion. Defaults match what
    // the hard-coded components printed, so an untouched set looks identical.
    kicker: { type: String, default: "Still Having Queries ?" },
    heading: { type: String, default: "Frequently Asked Questions" },
    footerText: { type: String, default: "Ask Your Queries..." },

    items: { type: [FaqItemSchema], default: [] },

    status: { type: String, enum: ["draft", "published"], default: "published" },
  },
  { timestamps: true }
);

// In dev, hot reloads can leave a stale compiled model (old schema) cached on
// the mongoose global — drop it so schema edits always take effect.
if (process.env.NODE_ENV !== "production" && mongoose.models.PageFaq) {
  delete mongoose.models.PageFaq;
}

export default mongoose.models.PageFaq || mongoose.model("PageFaq", PageFaqSchema);
