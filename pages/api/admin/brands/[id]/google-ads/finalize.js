// POST /api/admin/brands/[id]/google-ads/finalize
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();
  const { id } = req.query;
  const { customerId } = req.body;
  if (!customerId) return res.status(400).json({ success: false, message: "customerId required" });

  const brand = await Brand.findById(id).select("+googleAds._pendingCustomers").lean();
  if (!brand) return res.status(404).json({ success: false });

  const customer = (brand.googleAds?._pendingCustomers || []).find(c => c.id === customerId);
  if (!customer) return res.status(400).json({ success: false, message: "Customer not found in pending list" });

  await Brand.findByIdAndUpdate(id, {
    $set: {
      "googleAds.connected":         true,
      "googleAds.customerId":        customer.id,
      "googleAds.customerName":      customer.name,
      "googleAds._pendingCustomers": null,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/admin/brands/${id}/google-ads/sync`, {
    method: "POST", headers: { Cookie: "admin_auth=true" },
  }).catch(() => {});

  return res.json({ success: true, customerName: customer.name });
}
