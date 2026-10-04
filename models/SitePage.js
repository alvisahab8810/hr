// models/SitePage.js — one menu page's content, one document per page.
//
// Same idea as models/HomePage.js, but keyed by the page: "brand", "search"
// and so on, exactly the keys utils/pageSchemas/index.js lists. `sections` is
// the ordered band list the CRM edits and the page's bands component renders,
// each entry { id, type, on, data } as that page's schema describes it.
//
// KEEP THIS SCHEMA IDENTICAL to viralon-new/models/SitePage.js — the CRM
// writes this collection and the website reads it.
//
// `sections` is a plain Array rather than a typed sub-schema on purpose: a
// band carries a field called `type`, which Mongoose would read as a
// discriminator key and refuse to $set. The shape is guaranteed by the
// schema's cleanSections() before anything is stored.
import mongoose from "mongoose";

const SitePageSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    sections: { type: Array, default: [] },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.models.SitePage ||
  mongoose.model("SitePage", SitePageSchema);
