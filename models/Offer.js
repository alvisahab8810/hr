import mongoose from "mongoose";

const OfferSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  tag:         { type: String, enum: ["Special Offer", "Announcement", "New Feature", "Upgrade", "Event"], default: "Announcement" },
  target:      { type: String, enum: ["all", "specific"], default: "all" },
  brandIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Brand" }],
  ctaText:     { type: String, default: "" },
  ctaUrl:      { type: String, default: "" },
  validFrom:   { type: Date, default: Date.now },
  validUntil:  { type: Date },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

export default mongoose.models.Offer || mongoose.model("Offer", OfferSchema);
