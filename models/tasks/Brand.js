import mongoose from "mongoose";

const WeeklySlotSchema = new mongoose.Schema(
  {
    day:         { type: String, enum: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], required: true },
    contentType: { type: String, enum: ["reel","post","carousel","story"], required: true },
  },
  { _id: false }
);

const BrandSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    slug:         { type: String, trim: true },
    logo:         { type: String, default: "" },
    color:        { type: String, default: "#6366F1" },
    contactEmail: { type: String, default: "" },
    clientId:     { type: mongoose.Schema.Types.ObjectId, ref: "Client", default: null },

    /* ── Subscribed services ── */
    services: {
      type: [{ type: String, enum: ["socialMedia","website","seo","ads","branding"] }],
      default: [],
    },

    /* ── Social Media ── */
    monthlyDeliverables: {
      reels:     { type: Number, default: 0 },
      posts:     { type: Number, default: 0 },
      carousels: { type: Number, default: 0 },
      stories:   { type: Number, default: 0 },
    },
    weeklySchedule: { type: [WeeklySlotSchema], default: [] },

    /* ── Website ── */
    websiteSettings: {
      url:     { type: String, default: "" },
      cms:     { type: String, default: "" },
      hosting: { type: String, default: "" },
      notes:   { type: String, default: "" },
    },

    /* ── SEO ── */
    seoSettings: {
      blogCount:    { type: Number, default: 0 },
      blogSchedule: { type: [String], default: [] },
      technical:  { enabled: { type: Boolean, default: false }, notes: { type: String, default: "" } },
      onPage:     { enabled: { type: Boolean, default: false }, notes: { type: String, default: "" } },
      offPage:    { enabled: { type: Boolean, default: false }, notes: { type: String, default: "" } },
      backlinks:  { target: { type: Number, default: 0 },      notes: { type: String, default: "" } },
      keywords:   { count:  { type: Number, default: 0 },      notes: { type: String, default: "" } },
      notes:      { type: String, default: "" },
      competitors: {
        type: [{
          _id:     false,
          name:    { type: String, default: "" },
          website: { type: String, default: "" },
          type:    { type: String, default: "" },
        }],
        default: [],
      },
    },

    /* ── Ads ── */
    adsSettings: {
      platforms: { type: [String], default: [] },
      notes:     { type: String, default: "" },
    },

    /* ── Branding ── */
    brandingSettings: {
      logoDesign:          { type: Boolean, default: false },
      brandIdentityDesign: { type: Boolean, default: false },
      productPackaging:    { type: Boolean, default: false },
    },

    /* ── Instagram ── */
    instagram: {
      connected:    { type: Boolean, default: false },
      userId:       { type: String, default: "" },
      username:     { type: String, default: "" },
      token:        { type: String, default: "", select: false },
      tokenExpiry:  { type: Date,   default: null },
      followersCount: { type: Number, default: 0 },
      lastSync:     { type: Date,   default: null },
      /* cached post metrics — refreshed on sync */
      /* temp: populated during OAuth selection flow, cleared after */
      _pendingToken:    { type: String, default: "", select: false },
      _pendingAccounts: { type: mongoose.Schema.Types.Mixed, default: null, select: false },

      posts: [{
        _id:          false,
        igId:         String,
        mediaType:    String,
        caption:      String,
        permalink:    String,
        thumbnailUrl: String,
        timestamp:    Date,
        reach:        { type: Number, default: 0 },
        impressions:  { type: Number, default: 0 },
        likes:        { type: Number, default: 0 },
        comments:     { type: Number, default: 0 },
        saved:        { type: Number, default: 0 },
        shares:       { type: Number, default: 0 },
        videoViews:   { type: Number, default: 0 },
      }],

      /* daily profile-level snapshots — populated on each sync */
      profileInsights: [{
        _id:         false,
        date:        { type: String },        // "YYYY-MM-DD"
        followers:   { type: Number, default: 0 },
        reach:       { type: Number, default: 0 },
        impressions: { type: Number, default: 0 },
      }],
    },

    /* ── Google Search Console ── */
    gsc: {
      siteUrl:      { type: String, default: "" },
      refreshToken: { type: String, default: "", select: false },
      email:        { type: String, default: "" },
      connectedAt:  { type: Date,   default: null },
    },

    /* ── Meta Ads (Facebook Marketing API) ── */
    metaAds: {
      connected:        { type: Boolean, default: false },
      adAccountId:      { type: String, default: "" },      // act_XXXXXXXXXX
      adAccountName:    { type: String, default: "" },
      currency:         { type: String, default: "INR" },   // e.g. "INR", "USD", "AUD"
      token:            { type: String, default: "", select: false },
      tokenExpiry:      { type: Date,   default: null },
      lastSync:         { type: Date,   default: null },
      _pendingAccounts: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
    },

    /* ── Google Ads ── */
    googleAds: {
      connected:    { type: Boolean, default: false },
      customerId:   { type: String, default: "" },          // 123-456-7890
      customerName: { type: String, default: "" },
      refreshToken: { type: String, default: "", select: false },
      lastSync:     { type: Date,   default: null },
      _pendingCustomers: { type: mongoose.Schema.Types.Mixed, default: null, select: false },
    },

    managers: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
    notes:    { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BrandSchema.index({ name: 1 });
BrandSchema.index({ clientId: 1 });

delete mongoose.models["Brand"];
export default mongoose.model("Brand", BrandSchema);
