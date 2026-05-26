// GET  /api/client/requests?brandSlug=...  — list client's requests
// POST /api/client/requests                — create new request
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import TaskRequest from "@/models/TaskRequest";
import Brand from "@/models/tasks/Brand";
import AdminUser from "@/models/AdminUser";
import { sendNotification } from "@/utils/tasks/sendNotification";

function getClientPayload(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
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

  /* ── GET: list requests for this client+brand ── */
  if (req.method === "GET") {
    const { brandSlug } = req.query;
    const filter = { clientId: payload.id };
    if (brandSlug) {
      const brand = await Brand.findOne({ slug: brandSlug }).lean();
      if (brand) filter.brandId = brand._id;
    }
    const requests = await TaskRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("brandId", "name color slug")
      .lean();
    return res.json({ success: true, requests });
  }

  /* ── POST: create a new request ── */
  if (req.method === "POST") {
    const { brandId, title, contentType, brief, needBy, priority, referenceLinks } = req.body;

    if (!brandId || !title?.trim()) {
      return res.status(400).json({ success: false, message: "brandId and title are required" });
    }

    const brand = await Brand.findById(brandId).lean();
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });
    if (!brand.clientId || brand.clientId.toString() !== payload.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const request = await TaskRequest.create({
      clientId: payload.id,
      brandId,
      title: title.trim(),
      contentType: contentType || "",
      brief: brief || "",
      needBy: needBy ? new Date(needBy) : null,
      priority: priority || "medium",
      referenceLinks: Array.isArray(referenceLinks) ? referenceLinks.filter(Boolean) : [],
    });

    // Notify all admins
    try {
      const admins = await AdminUser.find({}).select("_id").lean();
      await Promise.all(admins.map(a =>
        sendNotification({
          recipientId: a._id,
          recipientModel: "AdminUser",
          type: "task_request",
          message: `New task request from ${payload.email} (${brand.name}): "${title.trim()}"`,
          requestId: request._id,
        })
      ));
    } catch (_) {}

    return res.status(201).json({ success: true, request });
  }

  return res.status(405).end();
}
