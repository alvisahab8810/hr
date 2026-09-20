// models/PageSeo.js — one SEO record per website page, edited from the payroll
// admin (Website → Pages SEO) and read by viralon-new in getStaticProps.
// IMPORTANT: keep this schema identical to viralon-new/models/PageSeo.js —
// both apps share the same Mongo "pageseos" collection (payroll writes,
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

export const DEFAULT_ROBOTS =
  "index, follow, max-image-preview:large, max-snippet:-1";

const PageSeoSchema = new mongoose.Schema(
  {
    // Route key from utils/sitePages.js — "home", "paid-ads",
    // "our-services/seo"… One record per page, hence the unique index.
    pageKey: { type: String, required: true, unique: true, index: true },
    pageLabel: { type: String, default: "" }, // snapshot for the admin list
    path: { type: String, default: "" },      // snapshot, used for canonicals

    title: { type: String, default: "" },
    metaKeywords: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    canonical: { type: String, default: "" },

    ogTitle: { type: String, default: "" },
    ogDescription: { type: String, default: "" },
    ogImage: { type: String, default: "" },
    twitterCard: { type: String, default: "summary_large_image" },

    // Robots directives. Both default to the same value, which is what the
    // site sends when a page has no record at all.
    metaRobots: { type: String, default: DEFAULT_ROBOTS },
    xRobotsTag: { type: String, default: DEFAULT_ROBOTS },

    schemas: { type: [SchemaBlockSchema], default: [] },

    status: { type: String, enum: ["draft", "published"], default: "published" },
  },
  { timestamps: true }
);

// Drop any stale compiled model so schema edits take effect without a restart.
if (mongoose.models.PageSeo) delete mongoose.models.PageSeo;
export default mongoose.model("PageSeo", PageSeoSchema);
