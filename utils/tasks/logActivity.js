import TaskActivity from "@/models/tasks/TaskActivity";

/**
 * Creates a TaskActivity record. Never throws — logs errors silently
 * so the parent operation is never blocked by activity logging.
 *
 * @param {object} opts
 * @param {string} opts.taskId
 * @param {string} opts.action        - one of TaskActivity enum values
 * @param {string} [opts.from]
 * @param {string} [opts.to]
 * @param {string} [opts.remark]
 * @param {string} opts.performedById
 * @param {string} opts.performedByModel - "AdminUser" | "Employee"
 * @param {string} opts.performedByName
 */
export async function logActivity({
  taskId,
  action,
  from = null,
  to = null,
  remark = "",
  performedById,
  performedByModel,
  performedByName,
}) {
  try {
    const doc = {
      taskId,
      action,
      from,
      to,
      remark,
      performedByModel: performedByModel || "AdminUser",
      performedByName:  performedByName  || "Admin",
    };
    if (performedById) doc.performedBy = performedById;
    await TaskActivity.create(doc);
  } catch (err) {
    console.error("logActivity failed:", err.message);
  }
}
