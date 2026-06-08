// POST /api/admin/brands/[id]/meta-ads/finalize — save selected ad account and trigger sync
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();
  const { id } = req.query;
  const { accountId } = req.body;
  if (!accountId) return res.status(400).json({ success: false, message: "accountId required" });

  // Get the pending accounts to find the chosen one's details + stored token
  const brand = await Brand.findById(id)
    .select("+metaAds._pendingAccounts +metaAds.token +metaAds.tokenExpiry")
    .lean();
  if (!brand) return res.status(404).json({ success: false });

  const acc = (brand.metaAds?._pendingAccounts || []).find(a => a.id === accountId);
  if (!acc) return res.status(400).json({ success: false, message: "Account not found in pending list" });

  const updateFields = {
    "metaAds.connected":        true,
    "metaAds.adAccountId":      acc.id,
    "metaAds.adAccountName":    acc.name,
    "metaAds.currency":         acc.currency || "INR",
    "metaAds._pendingAccounts": null,
  };
  // Carry forward the token that was saved during the OAuth callback
  if (brand.metaAds?.token)       updateFields["metaAds.token"]       = brand.metaAds.token;
  if (brand.metaAds?.tokenExpiry) updateFields["metaAds.tokenExpiry"] = brand.metaAds.tokenExpiry;

  await Brand.findByIdAndUpdate(id, { $set: updateFields });

  // Fire sync in background
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/admin/brands/${id}/meta-ads/sync`, {
    method: "POST", headers: { Cookie: "admin_auth=true" },
  }).catch(() => {});

  return res.json({ success: true, accountName: acc.name });
}
