// POST /api/admin/brands/[id]/instagram/finalize
// Called after admin selects which Instagram account to link to this brand
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
  const { igId } = req.body;

  if (!igId) return res.status(400).json({ success: false, message: "igId required" });

  // Load pending accounts (select: false fields)
  const brand = await Brand.findById(id).select("+instagram._pendingAccounts +instagram._pendingToken").lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const pendingAccounts = brand.instagram?._pendingAccounts || [];
  const selected = pendingAccounts.find(a => a.igId === igId);
  if (!selected) return res.status(400).json({ success: false, message: "Account not found in pending list" });

  await Brand.findByIdAndUpdate(id, {
    $set: {
      "instagram.connected":        true,
      "instagram.userId":           selected.igId,
      "instagram.username":         selected.username,
      "instagram.token":            selected.pageToken,
      "instagram.tokenExpiry":      new Date(selected.tokenExpiry),
      "instagram.followersCount":   selected.followersCount,
      "instagram.lastSync":         null,
      "instagram._pendingAccounts": null,
      "instagram._pendingToken":    "",
    },
  });

  // Trigger sync
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/admin/brands/${id}/instagram/sync`, {
    method: "POST", headers: { "Cookie": "admin_auth=true" },
  }).catch(() => {});

  return res.json({ success: true, username: selected.username });
}
