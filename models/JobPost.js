// models/JobPost.js — career position posts managed from the payroll admin
// (Website section) and rendered dynamically on the website's /jobs page.
// IMPORTANT: keep this schema identical to viralon-new/models/JobPost.js —
// both apps share the same Mongo "jobposts" collection (payroll writes,
// website reads).

import mongoose from "mongoose";

const JobPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },            // e.g. "Content Writer Intern"
    slug: { type: String, required: true, unique: true }, // e.g. "content-writer-intern"
    category: { type: String, enum: ["internship", "experienced"], required: true },

    // Listing card fields (components/jobs/Jobs.js)
    jobType: { type: String, default: "Full Time" },     // "Full Time"
    experience: { type: String, default: "" },           // "3-5 years of experience"
    highlights: { type: [String], default: [] },         // the 2 bullets on the card
    image: { type: String, default: "/assets/img/careers/img1.webp" },

    // Detail page fields (pages/jobs/[slug].js).
    // The long-form fields hold rich-text HTML from the admin editor; the
    // three list fields may also be legacy plain-string arrays (seed data),
    // hence Mixed — the website renderer handles both shapes.
    location: { type: String, default: "Lucknow" },
    qualification: { type: String, default: "" },
    aboutUs: { type: String, default: "" },
    jobOverview: { type: String, default: "" },
    responsibilities: { type: mongoose.Schema.Types.Mixed, default: "" },
    requiredQualifications: { type: mongoose.Schema.Types.Mixed, default: "" },
    whatWeOffer: { type: mongoose.Schema.Types.Mixed, default: "" },
    howToApply: { type: String, default: "" },

    status: { type: String, enum: ["open", "closed"], default: "open" },
    order: { type: Number, default: 0 }, // lower = shown first on the website
  },
  { timestamps: true }
);

// In dev, hot reloads can leave a stale compiled model (old schema) cached on
// the mongoose global — drop it so schema edits always take effect without a
// server restart. (A stale [String] cast once wrapped editor HTML in an array.)
if (process.env.NODE_ENV !== "production" && mongoose.models.JobPost) {
  delete mongoose.models.JobPost;
}

export default mongoose.models.JobPost || mongoose.model("JobPost", JobPostSchema);
