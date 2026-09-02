// pages/api/admin/job-posts/index.js — CRUD for career position posts shown on
// the website's /jobs page (internship & experienced tabs). Payroll admin
// writes into the shared Mongo "jobposts" collection; viralon-new reads it.
import dbConnect from "@/utils/dbConnect";
import JobPost from "@/models/JobPost";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// Extract plain-text lines from editor HTML (<li>/<p>/<br> separated),
// a newline-separated string, or an array — used for the card highlights,
// which the /jobs listing renders as plain <li> text.
function toLines(v) {
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  if (typeof v !== "string") return [];
  const text = v
    .replace(/<\/(li|p|div|h[1-6])>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
  return text.split("\n").map(s => s.trim()).filter(Boolean);
}

// The editor wraps each list item's text in a <p>; the website CSS gives
// .job_description p a large bottom margin, which would space bullets apart.
// Unwrap them so stored lists match the site's original <li>text</li> markup.
function cleanListItems(html) {
  return html
    .replace(/<li><p>/g, "<li>")
    .replace(/<\/p><\/li>/g, "</li>")
    .replace(/<\/p><p>(?=[^<]*<\/li>)/g, "<br>");
}

// Rich-text HTML from the admin editor: keep as-is, but collapse
// "visually empty" content (e.g. "<p></p>") to "" so the website hides
// the section. Legacy arrays pass through untouched.
function richField(v) {
  if (Array.isArray(v)) {
    // Heal docs saved through a stale [String] schema, which cast editor
    // HTML into a one-element array — join back into a single HTML string.
    if (v.some(x => typeof x === "string" && x.includes("<"))) {
      return cleanListItems(v.join(""));
    }
    return v.map(s => String(s).trim()).filter(Boolean);
  }
  const html = String(v || "").trim();
  if (!html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim()) return "";
  return cleanListItems(html);
}

export function sanitizeBody(body) {
  return {
    title: String(body.title || "").trim(),
    category: body.category === "experienced" ? "experienced" : "internship",
    jobType: String(body.jobType || "Full Time").trim(),
    experience: String(body.experience || "").trim(),
    highlights: toLines(body.highlights),
    image: String(body.image || "/assets/img/careers/img1.webp").trim(),
    location: String(body.location || "").trim(),
    qualification: String(body.qualification || "").trim(),
    aboutUs: richField(body.aboutUs),
    jobOverview: richField(body.jobOverview),
    responsibilities: richField(body.responsibilities),
    requiredQualifications: richField(body.requiredQualifications),
    whatWeOffer: richField(body.whatWeOffer),
    howToApply: richField(body.howToApply),
    status: body.status === "closed" ? "closed" : "open",
    order: Number.isFinite(Number(body.order)) ? Number(body.order) : 0,
  };
}

export async function uniqueSlug(base, excludeId) {
  let slug = base || "position";
  let n = 2;
  // Append -2, -3… until the slug is free.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const clash = await JobPost.findOne(
      excludeId ? { slug, _id: { $ne: excludeId } } : { slug }
    ).lean();
    if (!clash) return slug;
    slug = `${base}-${n++}`;
  }
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const posts = await JobPost.find().sort({ order: 1, createdAt: 1 }).lean();
      return res.status(200).json({ success: true, data: posts.map(p => ({ ...p, id: p._id })) });
    }

    if (req.method === "POST") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.title) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }
      doc.slug = await uniqueSlug(slugify(doc.title));
      const created = await JobPost.create(doc);
      return res.status(201).json({ success: true, data: created });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export { slugify };
