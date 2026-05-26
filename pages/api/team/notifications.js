// GET /api/team/notifications — returns unread counts for community + DMs
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import TeamCommunityMessage from "@/models/TeamCommunityMessage";
import TeamChatSeen from "@/models/TeamChatSeen";
import TeamDMMessage from "@/models/TeamDMMessage";

function resolveActor(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      if (p?.id) return { id: p.id, type: "employee" };
    } catch {}
  }
  if ((req.headers.cookie || "").includes("admin_auth=true"))
    return { id: "admin", type: "admin" };
  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const actor = resolveActor(req);
  if (!actor) return res.status(401).json({ success: false });

  let actorObjectId = null;
  let empName = "";

  if (actor.type === "employee") {
    const emp = await Employee.findById(actor.id).lean();
    if (!emp) return res.status(404).json({ success: false });
    actorObjectId = emp._id;
    empName = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
  } else {
    actorObjectId = new mongoose.Types.ObjectId("000000000000000000000000");
  }

  // Community unread: messages after lastSeenAt OR mentions of this user
  const seen = await TeamChatSeen.findOne({ userId: actorObjectId, userType: actor.type }).lean();
  const lastSeen = seen?.lastSeenAt || new Date(0);

  const communityUnread = await TeamCommunityMessage.countDocuments({
    createdAt: { $gt: lastSeen },
    senderId: { $ne: actorObjectId },
  });

  // Recent unread for hover tooltip (latest 5 community messages not sent by me)
  const recentMsgs = communityUnread > 0
    ? await TeamCommunityMessage.find({
        createdAt: { $gt: lastSeen },
        senderId: { $ne: actorObjectId },
      }).sort({ createdAt: -1 }).limit(5).lean()
    : [];

  const recent = recentMsgs.map(m => ({
    senderName: m.senderName,
    preview: (m.text || (m.attachments?.length ? "Sent an attachment" : "")).slice(0, 60),
    type: "community",
    at: m.createdAt,
  }));

  // DM unread (only relevant for employees)
  let dmUnread = 0;
  if (actor.type === "employee") {
    dmUnread = await TeamDMMessage.countDocuments({
      employeeId: actorObjectId,
      senderType: "admin",
      readByEmployee: false,
    });
  } else {
    // Admin: count all unread employee-sent DMs
    dmUnread = await TeamDMMessage.countDocuments({
      senderType: "employee",
      readByAdmin: false,
    });
  }

  return res.json({
    success: true,
    communityUnread,
    dmUnread,
    total: communityUnread + dmUnread,
    recent,
  });
}
