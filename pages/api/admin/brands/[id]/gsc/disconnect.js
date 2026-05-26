// DELETE /api/admin/brands/[id]/gsc/disconnect — remove GSC connection
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

  try {
    await Brand.findByIdAndUpdate(id, {
      $set: {
        "gsc.refreshToken": "",
        "gsc.siteUrl":      "",
        "gsc.email":        "",
        "gsc.connectedAt":  null,
      },
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
