// models/Query.js — the website leads / CRM record.
// IMPORTANT: keep this schema identical to viralon-new/models/Query.js — both
// apps share the same Mongo "queries" collection (the website's enquiry form
// creates leads, payroll → Website → Leads works them).
import mongoose from "mongoose";

const querySchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    businessName: String,
    formType: { type: String, default: "Query Form" },

    // Who owns this lead in the CRM (a User with role "salesperson").
    salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // The website's enquiry form asks for a monthly marketing budget.
    budget: { type: String, default: "" },

    // Where the lead came from — Google/Meta ad click ids and UTM tags picked up
    // from the landing URL, so paid leads can be traced back to the campaign.
    source: {
      gclid:       { type: String, default: "" },
      fbclid:      { type: String, default: "" },
      utmSource:   { type: String, default: "" },
      utmMedium:   { type: String, default: "" },
      utmCampaign: { type: String, default: "" },
      utmTerm:     { type: String, default: "" },
      utmContent:  { type: String, default: "" },
      campaignId:  { type: String, default: "" },
      adset:       { type: String, default: "" },
      adName:      { type: String, default: "" },
      landingPage: { type: String, default: "" },
      referrer:    { type: String, default: "" },
    },

    /* ── CRM fields (filled in by the team, not by the website form) ───────── */

    // New → Contacted → Meeting booked → Consultation done → Qualified →
    // Proposal sent → Negotiation → Won, with NPC / Not qualified / Lost as exits.
    status: { type: String, default: "New" },

    // Extra detail the form doesn't ask for.
    city:      { type: String, default: "" },
    industry:  { type: String, default: "" },
    service:   { type: String, default: "" },
    website:   { type: String, default: "" },
    instagram: { type: String, default: "" },
    notes:     { type: String, default: "" },

    // 0-10 qualification score, and which questions earned it.
    score:        { type: Number, default: null },
    scoreAnswers: { type: Map, of: Boolean, default: {} },

    // The meeting. The website books nothing — the team rings the lead first,
    // agrees how they'll meet, and fills this in by hand from the Leads board.
    meetingMode:  { type: String, enum: ["", "Google Meet", "Phone call", "In person"], default: "" },
    meetingDate:  { type: String, default: "" },   // "2026-09-04"
    meetingTime:  { type: String, default: "" },   // "16:30", IST
    meetLink:     { type: String, default: "" },   // the Meet / Zoom URL
    meetingPlace: { type: String, default: "" },   // where to go, for an in-person meeting

    held: { type: String, enum: ["", "held", "noshow"], default: "" },

    // Follow-up material pack.
    matSent:   { type: Boolean, default: false },
    matSentAt: { type: Date, default: null },

    lostReason: { type: String, default: "" },

    // Pre-call homework: which checklist items are ticked.
    prep:      { type: [String], default: [] },
    prepNotes: { type: String, default: "" },

    // Reminder mails already sent — ladder key + when.
    remindersSent: [
      {
        key: { type: String, default: "" },   // "invite" | "confirm" | "d2" | "d1" | "h3" | "m45" | "material"
        at:  { type: Date, default: Date.now },
      },
    ],

    // Every time the team tried to reach them.
    connects: [
      {
        at:      { type: Date, default: Date.now },
        via:     { type: String, default: "Call" },       // Call | WhatsApp | Email | SMS
        outcome: { type: String, default: "No answer" },  // Connected | No answer | Busy | Wrong number | Asked to call later
        note:    { type: String, default: "" },
        by:      { type: String, default: "" },
      },
    ],

    // Chronological journey — anything worth showing on a timeline.
    events: [
      {
        at:   { type: Date, default: Date.now },
        type: { type: String, default: "note" },
        text: { type: String, default: "" },
      },
    ],

    // Values for the admin-defined extra columns (see models/LeadField.js).
    customFields: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { timestamps: true }
);

// In dev the model stays cached across hot reloads, so a schema change (new
// CRM fields) would be silently ignored until a full restart — drop the cached
// copy so edits take effect immediately.
if (process.env.NODE_ENV !== "production" && mongoose.models.Query) {
  delete mongoose.models.Query;
}

export default mongoose.models.Query || mongoose.model("Query", querySchema);
