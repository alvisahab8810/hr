import Notification from "@/models/Notification";

/**
 * Creates a Notification record. Never throws — silent on failure.
 *
 * @param {object} opts
 * @param {string} opts.recipientId
 * @param {string} opts.recipientModel  - "AdminUser" | "Employee" | "Client"
 * @param {string} opts.type            - one of Notification enum values
 * @param {string} opts.message
 * @param {string} [opts.taskId]
 * @param {string} [opts.projectId]
 */
export async function sendNotification({
  recipientId,
  recipientModel,
  type,
  message,
  taskId = null,
  projectId = null,
  requestId = null,
}) {
  try {
    await Notification.create({
      recipientId,
      recipientModel,
      type,
      message,
      taskId,
      projectId,
      requestId,
    });
  } catch (err) {
    console.error("sendNotification failed:", err.message);
  }
}
