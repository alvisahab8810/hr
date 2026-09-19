// models/Newsletter.js — one footer newsletter signup.
//
// IMPORTANT: keep this schema identical to viralon-new/models/Newsletter.js.
// Both apps share the same Mongo "newsletters" collection: the website's footer
// form creates the record, and HQ (Website → Newsletter) works the list.
import mongoose from "mongoose";

const newsletterSchema = new mongoose.Schema(
  {
    // The address is the identity of the record — one row per person, kept
    // lower case so "Riyaz@..." and "riyaz@..." can never both get in.
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },

    // Unsubscribing keeps the row (so we know they left, and when) instead of
    // deleting it, which would let the next signup form re-add them silently.
    status: { type: String, enum: ["subscribed", "unsubscribed"], default: "subscribed" },

    // Where the signup came from: "website" is the footer form, "manual" is a
    // row typed in by the team from HQ.
    channel: { type: String, default: "website" },

    // Same idea as a lead's source — which page they were on and what brought
    // them there, so a campaign can be credited for the list it built.
    source: {
      page:        { type: String, default: "" },
      referrer:    { type: String, default: "" },
      utmSource:   { type: String, default: "" },
      utmMedium:   { type: String, default: "" },
      utmCampaign: { type: String, default: "" },
    },

    ip:        { type: String, default: "" },
    userAgent: { type: String, default: "" },

    // Free text for the team — why this address matters, who they are.
    notes: { type: String, default: "" },

    subscribedAt:   { type: Date, default: Date.now },
    unsubscribedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Newsletter ||
  mongoose.model("Newsletter", newsletterSchema);
