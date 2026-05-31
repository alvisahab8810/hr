import mongoose from "mongoose";

const StageSchema = new mongoose.Schema({
  key:       { type: String },
  label:     { type: String },
  owner:     { type: String, default: "" },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
  deadline:  { type: Date, default: null },
  completed: { type: Boolean, default: false },
}, { _id: false });

const CreativeSchema = new mongoose.Schema({
  name:     { type: String, default: "" },
  spend:    { type: Number, default: 0 },
  conv:     { type: Number, default: 0 },
  ctr:      { type: Number, default: 0 },
  thumbUrl: { type: String, default: "" },
}, { _id: false });

const AdCampaignSchema = new mongoose.Schema({
  name:           { type: String, required: true, trim: true },
  brandId:        { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
  externalId:     { type: String, default: "" },   // Meta campaign ID or Google campaign ID
  externalSource: { type: String, enum: ["manual", "meta", "google"], default: "manual" },
  platform: { type: String, enum: ["meta", "google", "youtube", "linkedin"], default: "meta" },
  budget:   { type: Number, default: 0 },
  agenda:   { type: String, default: "" },
  status:   { type: String, enum: ["planned", "active", "paused", "completed"], default: "planned" },
  stages:   { type: [StageSchema], default: () => ([
    { key: "creative", label: "Creative production" },
    { key: "setup",    label: "Setup & targeting" },
    { key: "budget",   label: "Budget approval" },
    { key: "live",     label: "Live monitoring" },
    { key: "optimize", label: "Optimization" },
  ]) },
  performance: {
    reach:       { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks:      { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    spent:       { type: Number, default: 0 },
    roas:        { type: Number, default: null },
    cpa:         { type: Number, default: null },
    ctr:         { type: Number, default: null },
  },
  creatives: { type: [CreativeSchema], default: [] },
}, { timestamps: true });

// Unique per Meta/Google campaign — prevents duplicates when multiple brands share an ad account
AdCampaignSchema.index({ externalId: 1, externalSource: 1 }, { unique: true, sparse: true });

delete mongoose.models["AdCampaign"];
export default mongoose.model("AdCampaign", AdCampaignSchema);
