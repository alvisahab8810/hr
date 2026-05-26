// GET /api/client/brand-info?slug=arc-solutions — public, no auth
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const { slug } = req.query;
  if (!slug) return res.status(400).json({ success: false, message: "slug required" });

  try {
    const brand = await Brand.findOne({ slug: slug.toLowerCase().trim() })
      .select("name slug color logo services")
      .lean();

    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
    return res.json({ success: true, brand });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
