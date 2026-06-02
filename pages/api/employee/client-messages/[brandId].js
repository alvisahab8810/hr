// GET   /api/employee/client-messages/[brandId] — fetch thread
// POST  /api/employee/client-messages/[brandId] — send team reply
// PATCH /api/employee/client-messages/[brandId] — edit / delete
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Brand from "@/models/tasks/Brand";
import ClientMessage from "@/models/ClientMessage";

function verifyToken(req) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false });

  await dbConnect();

  const emp = await Employee.findById(payload.id).lean();
  if (!emp) return res.status(404).json({ success: false });

  const dept = (emp.professional?.department || "").toLowerCase();
  if (!dept.includes("digital") && !dept.includes("marketing"))
    return res.status(403).json({ success: false, message: "Access restricted to Digital Marketing department" });

  const { brandId } = req.query;
  const brand = await Brand.findById(brandId).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const actorKey = `team_${emp._id}`;

  if (req.method === "GET") {
    await ClientMessage.updateMany(
      { brandId: brand._id, senderRole: "client", readByTeam: false },
      { $set: { readByTeam: true } }
    );
    const msgs = await ClientMessage.find({
      brandId: brand._id,
      deletedFor: { $ne: actorKey },
    }).sort({ createdAt: 1 }).lean();
    return res.json({ success: true, messages: msgs, brand: { name: brand.name, slug: brand.slug } });
  }

  if (req.method === "POST") {
    const { text, attachments, replyTo } = req.body || {};
    if (!text?.trim() && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Viralon Team";
    const msgData = {
      brandId:     brand._id,
      senderRole:  "team",
      senderName:  name,
      senderId:    emp._id,
      text:        (text || "").trim(),
      attachments: (attachments || []).filter(a => a.url && a.name),
      readByTeam:  true,
      readByClient:false,
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

    const isOwner = msg.senderRole === "team" && String(msg.senderId) === String(emp._id);

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
