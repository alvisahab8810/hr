// DELETE /api/admin/brands/[id]/google-ads/disconnect
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();
  await Brand.findByIdAndUpdate(req.query.id, {
    $set: {
      "googleAds.connected":         false,
      "googleAds.customerId":        "",
      "googleAds.customerName":      "",
      "googleAds.refreshToken":      "",
      "googleAds._pendingCustomers": null,
    },
  });
  return res.json({ success: true });
}
