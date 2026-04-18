// pages/api/admin/admin-users/[id].js
// DELETE — remove a user
// PATCH  — update permissions / role

import dbConnect from "@/utils/dbConnect";
import AdminUser from "@/models/AdminUser";

function adminGuard(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  if (req.method === "DELETE") {
    await AdminUser.findByIdAndDelete(id);
    return res.json({ success: true, message: "User deleted" });
  }

  if (req.method === "PATCH") {
    const { permissions, role, status } = req.body;
    const update = {};
    if (permissions !== undefined) update.permissions = permissions;
    if (role)                        update.role        = role;
    if (status)                      update.status      = status;

    const user = await AdminUser.findByIdAndUpdate(id, { $set: update }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, user });
  }

  return res.status(405).end();
}
