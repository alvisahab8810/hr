// GET   /api/team/community?limit=50&before=<isoDate>  — load messages
// POST  /api/team/community                             — send a message
// PATCH /api/team/community                             — edit / delete
// PUT   /api/team/community                             — mark seen
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import TeamCommunityMessage from "@/models/TeamCommunityMessage";
import TeamChatSeen from "@/models/TeamChatSeen";

function resolveActor(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      if (p?.id) return { id: p.id, type: "employee" };
    } catch {}
  }
  if ((req.headers.cookie || "").includes("admin_auth=true")) {
    return { id: "admin", type: "admin" };
  }
  return null;
}

export default async function handler(req, res) {
  await dbConnect();
  const actor = resolveActor(req);
  if (!actor) return res.status(401).json({ success: false });

  let senderName = "Admin";
  let senderDept = "";
  let actorObjectId = null;

  if (actor.type === "employee") {
    const emp = await Employee.findById(actor.id).lean();
    if (!emp) return res.status(404).json({ success: false });
    senderName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || emp.personal?.email || "Employee";
    senderDept = emp.professional?.department || "";
    actorObjectId = emp._id;
  } else {
    const { default: AdminUser } = await import("@/models/AdminUser");
    senderName = "Admin";
    senderDept = "Management";
    const mongoose = (await import("mongoose")).default;
    actorObjectId = new mongoose.Types.ObjectId("000000000000000000000000");
  }

  // Actor key used for deletedFor filtering
  const actorKey = actor.type === "admin" ? "admin" : `emp_${actorObjectId}`;

  /* ── GET ── */
  if (req.method === "GET") {
    const limit  = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(req.query.before) : null;
    const filter = {
      ...(before ? { createdAt: { $lt: before } } : {}),
      deletedFor: { $ne: actorKey },
    };
    const msgs = await TeamCommunityMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ success: true, messages: msgs.reverse() });
  }

  /* ── POST ── */
  if (req.method === "POST") {
    const { text, mentions, attachments, replyTo } = req.body || {};
    if (!text?.trim() && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const msgData = {
      senderId:   actorObjectId,
      senderType: actor.type,
      senderName,
      senderDept,
      text:        (text || "").trim(),
      mentions:    (mentions || []).filter(m => m.name),
      attachments: (attachments || []).filter(a => a.url && a.name),
    };
    if (replyTo?.msgId) {
      msgData.replyTo = {
        msgId:      replyTo.msgId,
        senderName: replyTo.senderName || "",
        text:       (replyTo.text || "").slice(0, 120),
      };
    }
    const msg = await TeamCommunityMessage.create(msgData);

    // Broadcast to all connected clients via Socket.IO (real-time, no polling)
    try {
      if (global._io) {
        global._io.emit("community:message", {
          _id:        String(msg._id),
          senderName: msg.senderName,
          senderType: msg.senderType,
          senderId:   String(msg.senderId),
          text:       (msg.text || "").slice(0, 100),
        });
      }
    } catch {}

    return res.status(201).json({ success: true, message: msg });
  }

  /* ── PATCH — edit / delete ── */
  if (req.method === "PATCH") {
    const { messageId, action, text } = req.body || {};
    if (!messageId) return res.status(400).json({ success: false, message: "messageId required" });

    const msg = await TeamCommunityMessage.findById(messageId);
    if (!msg) return res.status(404).json({ success: false, message: "Message not found" });

    const isOwner = actor.type === "admin"
      ? msg.senderType === "admin"
      : String(msg.senderId) === String(actorObjectId);

    if (action === "edit") {
      if (!isOwner) return res.status(403).json({ success: false, message: "Cannot edit others' messages" });
      if (!text?.trim()) return res.status(400).json({ success: false, message: "Text required" });
      msg.text   = text.trim();
      msg.edited = true;
      await msg.save();
      return res.json({ success: true, message: msg.toObject() });
    }

    if (action === "deleteForAll") {
      if (!isOwner) return res.status(403).json({ success: false, message: "Cannot delete others' messages" });
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

  /* ── PUT — mark seen ── */
  if (req.method === "PUT") {
    const filter = actor.type === "employee"
      ? { userId: actorObjectId, userType: "employee" }
      : { userId: actorObjectId, userType: "admin" };
    await TeamChatSeen.findOneAndUpdate(
      filter,
      { $set: { lastSeenAt: new Date() } },
      { upsert: true }
    );
    return res.json({ success: true });
  }

  return res.status(405).end();
}
