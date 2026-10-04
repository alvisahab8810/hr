// pages/api/admin/home-page/index.js — the home page's content.
//
// One document, keyed "home", in the shared Mongo "homepages" collection;
// viralon-new reads it in pages/index.js and renders the bands in the order
// stored here. There is no list and no create: the home page always exists,
// so this is GET (read) and PUT (save), plus DELETE to put it back to the
// shipped bands.
//
// Everything stored is walked against utils/homeSchema.js — the same
// descriptors the website renders from — so an undeclared band or a field the
// website does not know about cannot be written.
import dbConnect from "@/utils/dbConnect";
import HomePage from "@/models/HomePage";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { cleanSections, defaultSections } from "@/utils/homeSchema";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const doc = await HomePage.findOne({ key: "home" }).lean();
      // Nothing saved yet: hand back the shipped bands so the editor opens on
      // the home page as it currently reads, rather than on an empty list.
      return res.status(200).json({
        success: true,
        data: {
          sections: doc?.sections?.length ? doc.sections : defaultSections(),
          saved: Boolean(doc?.sections?.length),
          updatedAt: doc?.updatedAt || null,
        },
      });
    }

    if (req.method === "PUT") {
      const sections = cleanSections(req.body?.sections);
      if (!sections.length) {
        return res
          .status(400)
          .json({ success: false, message: "The home page needs at least one band" });
      }
      const doc = await HomePage.findOneAndUpdate(
        { key: "home" },
        { $set: { key: "home", sections } },
        { new: true, upsert: true }
      ).lean();
      return res.status(200).json({ success: true, data: { sections: doc.sections } });
    }

    if (req.method === "DELETE") {
      // Back to the bands as the site ships them. The record is removed
      // rather than overwritten, so the website falls through to the copy
      // written in each component.
      await HomePage.deleteOne({ key: "home" });
      return res.status(200).json({ success: true, data: { sections: defaultSections() } });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
