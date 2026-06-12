// GET  /api/client/requests/[id]/messages  — get thread messages
// POST /api/client/requests/[id]/messages  — client sends a message
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import TaskRequest from "@/models/TaskRequest";
import Client from "@/models/clients/Client";

function getClientPayload(req) {
  const cookie = req.headers.cookie || "";
  const match  = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  const payload = getClientPayload(req);
  if (!payload || payload.role !== "client") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();
  const { id } = req.query;

  const request = await TaskRequest.findById(id).lean();
  if (!request) return res.status(404).json({ success: false, message: "Not found" });

  // Ensure this request belongs to the authenticated client
  if (request.clientId.toString() !== payload.id) {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  if (req.method === "GET") {
    return res.json({ success: true, messages: request.messages || [] });
  }

  if (req.method === "POST") {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ success: false, message: "text required" });

    const client = await Client.findById(payload.id).select("name").lean();
    const senderName = client?.name || "Client";

    const updated = await TaskRequest.findByIdAndUpdate(
      id,
      { $push: { messages: { senderRole: "client", senderName, text: text.trim() } } },
      { new: true }
    ).lean();

    return res.json({ success: true, messages: updated.messages });
  }

  return res.status(405).end();
}
