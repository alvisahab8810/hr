// GET  /api/team/community?limit=50&before=<isoDate>  — load messages
// POST /api/team/community                             — send a message
// PUT  /api/team/community                             — mark seen (updates lastSeenAt)
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import TeamCommunityMessage from "@/models/TeamCommunityMessage";
import TeamChatSeen from "@/models/TeamChatSeen";

function resolveActor(req) {
  // Employee: Bearer token
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      if (p?.id) return { id: p.id, type: "employee" };
    } catch {}
  }
  // Admin: cookie
  if ((req.headers.cookie || "").includes("admin_auth=true")) {
    return { id: "admin", type: "admin" };
  }
  return null;
}

function getAdminId(req) {
  // Try to find a real admin ObjectId from cookie session if available
  // For now we use a fixed sentinel; real admin identity resolved by /api/admin-users/me separately
  return null;
}

export default async function handler(req, res) {
  await dbConnect();
  const actor = resolveActor(req);
  if (!actor) return res.status(401).json({ success: false });

  // Resolve real employee doc for name/dept
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
    // Admin: try to get admin user info via separate lookup (best effort)
    const { default: AdminUser } = await import("@/models/AdminUser");
    const cookies = req.headers.cookie || "";
    // Admin sessions don't carry an id in cookie by default — attempt token lookup
    // For community, use "Admin" as fallback name
    senderName = "Admin";
    senderDept = "Management";
    // We'll store adminId as a placeholder ObjectId derived from env or just leave null
    const mongoose = (await import("mongoose")).default;
    actorObjectId = new mongoose.Types.ObjectId("000000000000000000000000");
  }

  if (req.method === "GET") {
    const limit  = Math.min(Number(req.query.limit) || 50, 100);
    const before = req.query.before ? new Date(req.query.before) : null;
    const filter = before ? { createdAt: { $lt: before } } : {};
    const msgs = await TeamCommunityMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ success: true, messages: msgs.reverse() });
  }

  if (req.method === "POST") {
    const { text, mentions, attachments } = req.body || {};
    if (!text?.trim() && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const msg = await TeamCommunityMessage.create({
      senderId:   actorObjectId,
      senderType: actor.type,
      senderName,
      senderDept,
      text:        (text || "").trim(),
      mentions:    (mentions || []).filter(m => m.name),
      attachments: (attachments || []).filter(a => a.url && a.name),
    });
    return res.status(201).json({ success: true, message: msg });
  }

  if (req.method === "PUT") {
    // Mark seen
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
