// GET   /api/client/messages?brand=slug  — fetch thread
// POST  /api/client/messages?brand=slug  — send message
// PATCH /api/client/messages?brand=slug  — edit / delete
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";
import ClientMessage from "@/models/ClientMessage";

function getClientPayload(req) {
  const cookie = req.headers.cookie || "";
  const match  = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  const payload = getClientPayload(req);
  if (!payload || payload.role !== "client")
    return res.status(401).json({ success: false });

  await dbConnect();

  const client = await Client.findById(payload.id).lean();
  if (!client) return res.status(404).json({ success: false });

  const { brand: brandSlug } = req.query;
  const brand = await Brand.findOne({ slug: brandSlug, clientId: client._id }).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const actorKey = "client";

  if (req.method === "GET") {
    await ClientMessage.updateMany(
      { brandId: brand._id, senderRole: "team", readByClient: false },
      { $set: { readByClient: true } }
    );
    const msgs = await ClientMessage.find({
      brandId: brand._id,
      deletedFor: { $ne: actorKey },
    }).sort({ createdAt: 1 }).lean();
    return res.json({ success: true, messages: msgs });
  }

  if (req.method === "POST") {
    const { text, attachments, replyTo } = req.body || {};
    if (!text?.trim() && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const msgData = {
      brandId:     brand._id,
      senderRole:  "client",
      senderName:  client.name || client.email,
      senderId:    client._id,
      text:        (text || "").trim(),
      attachments: (attachments || []).filter(a => a.url && a.name),
      readByTeam:  false,
      readByClient:true,
    };
    if (replyTo?.msgId) {
      msgData.replyTo = {
        msgId:      replyTo.msgId,
        senderName: replyTo.senderName || "",
        text:       (replyTo.text || "").slice(0, 120),
      };
    }
    const msg = await ClientMessage.create(msgData);
    return res.status(201).json({ success: true, message: msg });
  }

  if (req.method === "PATCH") {
    const { messageId, action, text } = req.body || {};
    if (!messageId) return res.status(400).json({ success: false, message: "messageId required" });

    const msg = await ClientMessage.findOne({ _id: messageId, brandId: brand._id });
    if (!msg) return res.status(404).json({ success: false });

    const isOwner = msg.senderRole === "client";

    if (action === "edit") {
      if (!isOwner) return res.status(403).json({ success: false });
      if (!text?.trim()) return res.status(400).json({ success: false });
      msg.text   = text.trim();
      msg.edited = true;
      await msg.save();
      return res.json({ success: true, message: msg.toObject() });
    }
    if (action === "deleteForAll") {
      if (!isOwner) return res.status(403).json({ success: false });
      msg.deleted     = true;
      msg.text        = "";
      msg.attachments = [];
      msg.replyTo     = null;
      await msg.save();
      return res.json({ success: true, message: msg.toObject() });
    }
    if (action === "deleteForMe") {
      if (!msg.deletedFor.includes(actorKey)) {
        msg.deletedFor.push(actorKey);
        await msg.save();
      }
      return res.json({ success: true });
    }
    return res.status(400).json({ success: false, message: "Invalid action" });
  }

  return res.status(405).end();
}
