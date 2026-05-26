// GET  /api/admin/task-requests/[id]/messages  — get thread
// POST /api/admin/task-requests/[id]/messages  — admin reply
import dbConnect from "@/utils/dbConnect";
import TaskRequest from "@/models/TaskRequest";
import AdminUser from "@/models/AdminUser";
import { sendNotification } from "@/utils/tasks/sendNotification";

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

  const request = await TaskRequest.findById(id).lean();
  if (!request) return res.status(404).json({ success: false, message: "Not found" });

  if (req.method === "GET") {
    return res.json({ success: true, messages: request.messages || [] });
  }

  if (req.method === "POST") {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: "text required" });

    const admin = await AdminUser.findOne({}).select("name").lean();
    const senderName = admin?.name || "Viralon Team";

    const updated = await TaskRequest.findByIdAndUpdate(
      id,
      { $push: { messages: { senderRole: "admin", senderName, text: text.trim() } } },
      { new: true }
    ).lean();

    // Notify client
    if (request.clientId) {
      await sendNotification({
        recipientId: request.clientId,
        recipientModel: "Client",
        type: "task_request_reviewed",
        message: `Viralon replied on your request "${request.title}": ${text.trim().slice(0, 80)}`,
        requestId: id,
      });
    }

    return res.json({ success: true, messages: updated.messages });
  }

  return res.status(405).end();
}
