// scripts/seed-job-posts.js — one-time seed of the career positions that were
// hardcoded in viralon-new's components/jobs/Jobs.js, so the now-dynamic
// /jobs page doesn't start empty. Safe to re-run: inserts only missing slugs
// ($setOnInsert) and never overwrites admin edits.
//
// Run from the payroll repo root:  node scripts/seed-job-posts.js
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

// Read MONGODB_URI from .env.local without needing dotenv.
const envFile = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8");
const match = envFile.match(/^MONGODB_URI=(.+)$/m);
if (!match) { console.error("MONGODB_URI not found in .env.local"); process.exit(1); }
const MONGODB_URI = match[1].trim().replace(/^["']|["']$/g, "");

const JobPostSchema = new mongoose.Schema({
  title: String, slug: String, category: String,
  jobType: String, experience: String, highlights: [String], image: String,
  location: String, qualification: String, aboutUs: String, jobOverview: String,
  responsibilities: [String], requiredQualifications: [String], whatWeOffer: [String],
  howToApply: String, status: String, order: Number,
}, { timestamps: true });
const JobPost = mongoose.models.JobPost || mongoose.model("JobPost", JobPostSchema);

const cwHighlights = [
  "Bachelor's degree in English, Communications, or a related field.",
  "Strong portfolio showcasing diverse writing samples.",
];

const POSTS = [
  {
    title: "CONTENT WRITER INTERN", slug: "content-writer-intern", category: "internship",
    jobType: "Full Time", experience: "3-5 years of experience", highlights: cwHighlights,
    image: "/assets/img/careers/img1.webp", order: 1,
    location: "Lucknow",
    qualification: "Bachelor's Degree in English, Communications, or a related field",
    aboutUs: "Viralon is a dynamic, creative-driven company specializing in Marketing. We are passionate about delivering high-quality content that engages and informs our target audiences. We're seeking a talented and motivated Content Writer Intern to join our content team and contribute to the development of compelling content for our various platforms.",
    jobOverview: "As a Content Writer Intern, you will work closely with our senior content team to create engaging and informative content across multiple channels, including websites, blogs, social media, newsletters, and more. This is an exciting opportunity for a passionate writer who is eager to learn, grow, and contribute to the creation of impactful content.",
    responsibilities: [
      "Assist in writing, editing, and proofreading content for various formats including blogs, website copy, email campaigns, and social media posts.",
      "Research industry-specific topics to ensure content is informative, accurate, and SEO-friendly.",
      "Collaborate with the marketing and design teams to align content with brand voice and marketing goals.",
      "Develop ideas and strategies for content creation to improve engagement and drive traffic.",
      "Contribute to the creation of content calendars, ensuring timely and consistent delivery.",
      "Participate in brainstorming sessions and provide creative input for upcoming projects.",
      "Track and analyze content performance metrics to make data-driven improvements.",
      "Maintain consistency in tone, style, and quality across all content types.",
    ],
    requiredQualifications: [
      "Bachelor's degree in English, Communications, Journalism, or a related field.",
      "3-5 years of experience in content writing, with a portfolio showcasing diverse writing samples (blog posts, articles, website copy, etc.).",
      "Strong understanding of SEO best practices and digital content trends.",
      "Excellent written communication skills, with a keen eye for detail and grammar.",
      "Ability to write in a clear, concise, and engaging style that appeals to diverse audiences.",
      "Strong research skills and the ability to adapt content based on target audience and platform.",
      "Ability to work independently and as part of a team in a fast-paced environment.",
      "Proficiency in content management systems (CMS) and basic knowledge of HTML is a plus.",
    ],
    whatWeOffer: [
      "Mentorship and professional development opportunities from experienced writers and marketers.",
      "Exposure to a wide range of content types and projects.",
      "A collaborative and creative work environment.",
      "Opportunity to contribute to the company's content strategy and growth.",
    ],
    howToApply: "Please submit your updated resume, a cover letter, and a portfolio of writing samples. In your cover letter, please highlight your experience, why you're passionate about content writing, and how you would contribute to our team. Join us at Viralon and kickstart your career as a content writer in an innovative and fast-paced environment! We look forward to hearing from you.",
  },
  {
    title: "Photographer Intern", slug: "photographer-intern", category: "internship",
    jobType: "Full Time", experience: "3-5 years of experience",
    highlights: ["Strong portfolio in composition, lighting & editing.", "Proficient in Lightroom, Photoshop & professional cameras."],
    image: "/assets/img/careers/img3.webp", order: 2, location: "Lucknow",
  },
  {
    title: "Videographer Intern", slug: "videographer-intern", category: "internship",
    jobType: "Full Time", experience: "1-3 years of experience",
    highlights: ["Experience in high-quality video shooting.", "Skilled in Premiere Pro & cinematography techniques."],
    image: "/assets/img/careers/img2.webp", order: 3, location: "Lucknow",
  },
  {
    title: "Video Editor Intern", slug: "video-editor-intern", category: "internship",
    jobType: "Full Time", experience: "1-3 years of experience",
    highlights: ["Strong storytelling & post-production skills.", "Proficient in Premiere Pro, After Effects & color grading."],
    image: "/assets/img/careers/img3.webp", order: 4, location: "Lucknow",
  },
  {
    title: "CONTENT WRITER", slug: "content-writer", category: "experienced",
    jobType: "Full Time", experience: "3-5 years of experience", highlights: cwHighlights,
    image: "/assets/img/careers/img1.webp", order: 1, location: "Lucknow",
  },
  {
    title: "Photographer", slug: "photographer", category: "experienced",
    jobType: "Full Time", experience: "3-5 years of experience",
    highlights: ["Strong portfolio in composition, lighting & editing.", "Proficient in Lightroom, Photoshop & professional cameras."],
    image: "/assets/img/careers/img3.webp", order: 2, location: "Lucknow",
  },
  {
    title: "Videographer", slug: "videographer", category: "experienced",
    jobType: "Full Time", experience: "1-3 years of experience",
    highlights: ["Experience in high-quality video shooting.", "Skilled in Premiere Pro & cinematography techniques."],
    image: "/assets/img/careers/img2.webp", order: 3, location: "Lucknow",
  },
  {
    title: "Video Editor", slug: "video-editor", category: "experienced",
    jobType: "Full Time", experience: "1-3 years of experience",
    highlights: ["Strong storytelling & post-production skills.", "Proficient in Premiere Pro, After Effects & color grading."],
    image: "/assets/img/careers/img3.webp", order: 4, location: "Lucknow",
  },
];

(async () => {
  await mongoose.connect(MONGODB_URI);
  let inserted = 0, skipped = 0;
  for (const post of POSTS) {
    const res = await JobPost.updateOne(
      { slug: post.slug },
      { $setOnInsert: { ...post, status: "open" } },
      { upsert: true }
    );
    if (res.upsertedCount) { inserted++; console.log(`  + inserted: ${post.slug}`); }
    else { skipped++; console.log(`  = exists:   ${post.slug}`); }
  }
  console.log(`Done. ${inserted} inserted, ${skipped} already present.`);
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
