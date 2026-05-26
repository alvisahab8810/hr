// GET /api/admin/brands/[id]/meta-ads/accounts — return pending ad accounts for selection
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();
  const brand = await Brand.findById(req.query.id)
    .select("name +metaAds._pendingAccounts")
    .lean();
  if (!brand) return res.status(404).json({ success: false });

  return res.json({
    success:  true,
    brandName: brand.name,
    accounts: brand.metaAds?._pendingAccounts || [],
  });
}
