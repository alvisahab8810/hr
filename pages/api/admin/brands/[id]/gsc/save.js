// POST /api/admin/brands/[id]/gsc/save — save the selected GSC siteUrl
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

function adminGuard(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();
  const { id } = req.query;
  const { siteUrl } = req.body;

  if (!siteUrl) return res.status(400).json({ success: false, message: "siteUrl is required" });

  try {
    await Brand.findByIdAndUpdate(id, { $set: { "gsc.siteUrl": siteUrl } });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
