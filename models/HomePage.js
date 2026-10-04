// models/HomePage.js — the home page's content, as one document.
//
// There is only ever one home page, so this collection holds a single record
// keyed "home" rather than a list. `sections` is the ordered band list the
// CRM edits and the website renders, each entry
// { id, type, on, data } exactly as utils/homeSchema.js describes it.
//
// KEEP THIS SCHEMA IDENTICAL to viralon-new/models/HomePage.js — the CRM
// writes this collection and the website reads it.
//
// `sections` is a plain Array rather than a typed sub-schema on purpose: a
// band carries a field called `type`, which Mongoose would read as a
// discriminator key and refuse to $set. The shape is guaranteed by
// cleanSections() in utils/homeSchema.js before anything is stored.
import mongoose from "mongoose";

const HomePageSchema = new mongoose.Schema(
  {
    key: { type: String, default: "home", unique: true, index: true },
    sections: { type: Array, default: [] },
  },
  { timestamps: true, minimize: false }
);

export default mongoose.models.HomePage ||
  mongoose.model("HomePage", HomePageSchema);
