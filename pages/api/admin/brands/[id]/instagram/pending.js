// GET /api/admin/brands/[id]/instagram/pending
// Returns the list of available Instagram accounts waiting for admin selection
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
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();
  const { id } = req.query;

  const brand = await Brand.findById(id)
    .select("name instagram._pendingAccounts")
    .lean();

  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const accounts = (brand.instagram?._pendingAccounts || []).map(a => ({
    igId:           a.igId,
    username:       a.username,
    followersCount: a.followersCount,
    pageName:       a.pageName,
  }));

  return res.json({ success: true, brandName: brand.name, accounts });
}
