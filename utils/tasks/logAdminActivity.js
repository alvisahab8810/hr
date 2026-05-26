import AdminActivityLog from "@/models/AdminActivityLog";

export async function logAdminActivity({
  adminUserId,
  adminUserName,
  adminUserRole = "",
  action,
  category = "task",
  description,
  metadata = {},
}) {
  if (!adminUserId || !adminUserName || !action || !description) return;
  try {
    await AdminActivityLog.create({
      adminUserId,
      adminUserName,
      adminUserRole,
      action,
      category,
      description,
      metadata,
    });
  } catch (e) {
    console.error("[admin-activity-log] failed:", e.message);
  }
}
