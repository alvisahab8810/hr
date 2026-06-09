// GET /api/client/overview?brandSlug=arc-solutions
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";
import Task from "@/models/tasks/Task";
import "@/models/hr/Employee";

function getToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const payload = getToken(req);
  if (!payload || payload.role !== "client") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();

  try {
    const { brandSlug } = req.query;
    if (!brandSlug) return res.status(400).json({ success: false, message: "brandSlug required" });

    const brand = await Brand.findOne({ slug: brandSlug }).select("+instagram.token").lean();
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

    if (!brand.clientId || brand.clientId.toString() !== payload.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const allTasks = await Task.find({ brandId: brand._id })
      .populate("assignedTo", "firstName lastName personal")
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    const now = new Date();
    const startOfWeek = new Date(now);
    const dow = now.getDay();
    startOfWeek.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Tasks explicitly in review, OR production tasks where a S2/S3 stage was submitted
    // but status got stuck at in_progress (admin approved stage with old buggy code)
    const pending    = allTasks.filter(t => {
      if (t.status === "review") return true;
      if (t.taskType !== "production" || t.status !== "in_progress") return false;
      const stageNum  = t.stage ? parseInt(t.stage.replace("S","")) : 1;
      if (stageNum < 2) return false; // S1 never goes to client
      const activeIdx = stageNum - 1;
      const curStage  = t.stages?.[activeIdx];
      const prevStage = t.stages?.[activeIdx - 1];
      const curUnassigned = !curStage?.assignedTo?.length;
      const prevApproved  = prevStage?.done && prevStage?.approved;
      return curUnassigned && prevApproved;
    });
    const thisWeek   = allTasks.filter(t => t.dueDate && new Date(t.dueDate) >= startOfWeek && new Date(t.dueDate) <= endOfWeek && t.status !== "completed");
    const delivered  = allTasks.filter(t => t.status === "completed" && t.postedAt && new Date(t.postedAt) >= startOfMonth);
    const inProgress = allTasks.filter(t => ["todo","in_progress"].includes(t.status));

    const statusCounts = {};
    for (const t of allTasks) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }

    const monthly = brand.monthlyDeliverables || {};
    // Shipped = status completed OR S4 (posting stage) done OR postedAt set
    const isShipped = t => t.status === "completed" || !!t.stages?.[3]?.done || !!t.postedAt;
    const posted  = allTasks.filter(isShipped).length;

    // Strip token from brand before sending to client
    const { instagram: igRaw, ...brandSafe } = brand;
    const instagram = igRaw ? {
      connected:       igRaw.connected        || false,
      username:        igRaw.username         || "",
      followersCount:  igRaw.followersCount   || 0,
      lastSync:        igRaw.lastSync         || null,
      posts:           igRaw.posts            || [],
      profileInsights: igRaw.profileInsights  || [],
    } : null;

    return res.json({
      success: true,
      brand: brandSafe,
      instagram,
      stats: {
        totalTasks:   allTasks.length,
        awaitingYou:  pending.length,
        inProgress:   inProgress.length,
        delivered:    delivered.length,
        statusCounts,
        monthly,
        posted,
      },
      pending,
      thisWeek,
      delivered,
      allTasks,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
