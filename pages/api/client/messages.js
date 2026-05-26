// GET  /api/client/messages?brand=slug  — fetch thread for this brand
// POST /api/client/messages?brand=slug  — send a new message
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

  if (req.method === "GET") {
    // Mark all team messages as read by client
    await ClientMessage.updateMany(
      { brandId: brand._id, senderRole: "team", readByClient: false },
      { $set: { readByClient: true } }
    );

    const msgs = await ClientMessage.find({ brandId: brand._id })
      .sort({ createdAt: 1 })
      .lean();
    return res.json({ success: true, messages: msgs });
  }

  if (req.method === "POST") {
    const { text, attachments } = req.body || {};
    if (!text?.trim() && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const msg = await ClientMessage.create({
      brandId:     brand._id,
      senderRole:  "client",
      senderName:  client.name || client.email,
      senderId:    client._id,
      text:        (text || "").trim(),
      attachments: (attachments || []).filter(a => a.url && a.name),
      readByTeam:  false,
      readByClient:true,
    });
    return res.status(201).json({ success: true, message: msg });
  }

  return res.status(405).end();
}
