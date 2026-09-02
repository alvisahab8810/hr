// pages/api/admin/job-posts/[id].js — update/delete a single career position post.
import dbConnect from "@/utils/dbConnect";
import JobPost from "@/models/JobPost";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { sanitizeBody, slugify, uniqueSlug } from "./index";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  try {
    const existing = await JobPost.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Job post not found" });
    }

    if (req.method === "GET") {
      return res.status(200).json({ success: true, data: existing });
    }

    if (req.method === "PUT") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.title) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }
      // Regenerate the slug only when the title actually changed, so existing
      // /jobs/<slug> links keep working after minor edits.
      if (doc.title !== existing.title) {
        doc.slug = await uniqueSlug(slugify(doc.title), existing._id);
      }
      Object.assign(existing, doc);
      await existing.save();
      return res.status(200).json({ success: true, data: existing });
    }

    if (req.method === "DELETE") {
      await existing.deleteOne();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
