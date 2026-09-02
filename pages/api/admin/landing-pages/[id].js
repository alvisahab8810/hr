// pages/api/admin/landing-pages/[id].js — read / update / delete one SEO
// landing page (shared "landingpages" collection, rendered by viralon-new).
import dbConnect from "@/utils/dbConnect";
import LandingPage from "@/models/LandingPage";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { sanitizeBody, resolveSlug } from "./index";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  try {
    const existing = await LandingPage.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Page not found" });
    }

    if (req.method === "GET") {
      return res.status(200).json({ success: true, data: existing });
    }

    if (req.method === "PUT") {
      const doc = sanitizeBody(req.body || {});
      if (!doc.title) {
        return res.status(400).json({ success: false, message: "Title is required" });
      }
      // Keep the current slug unless the admin typed a new one.
      const rawSlug = req.body?.slug ?? existing.slug;
      const resolved = await resolveSlug(rawSlug, doc.title, existing._id);
      if (resolved.error) {
        return res.status(400).json({ success: false, message: resolved.error });
      }
      doc.slug = resolved.slug;
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
