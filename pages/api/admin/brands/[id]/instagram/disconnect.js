// DELETE /api/admin/brands/[id]/instagram/disconnect
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
  if (req.method !== "DELETE") return res.status(405).end();
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;
  await Brand.findByIdAndUpdate(id, {
    $set: {
      "instagram.connected":  false,
      "instagram.userId":     "",
      "instagram.username":   "",
      "instagram.token":      "",
      "instagram.tokenExpiry": null,
      "instagram.lastSync":   null,
      "instagram.posts":      [],
    },
  });

  return res.json({ success: true });
}
