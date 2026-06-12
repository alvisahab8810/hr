// GET  /api/client/requests?brandSlug=...  — list client's requests with status
// POST /api/client/requests                — submit a new task request
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";
import TaskRequest from "@/models/TaskRequest";
import { sendClientRequestEmail } from "@/utils/email/sendTaskEmail";

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

  /* ── GET: list this client's requests ── */
  if (req.method === "GET") {
    const { brandSlug } = req.query;
    const filter = { clientId: payload.id };
    if (brandSlug) {
      const brand = await Brand.findOne({ slug: brandSlug }).select("_id").lean();
      if (brand) filter.brandId = brand._id;
    }
    const requests = await TaskRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("brandId", "name color slug")
      .populate("clientId", "name email")
      .lean();
    return res.json({ success: true, requests });
  }

  /* ── POST: create a new request ── */
  if (req.method === "POST") {
    const { brandId, title, contentType, brief, needBy, priority, referenceLinks } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: "Title is required" });
    if (!brandId)       return res.status(400).json({ success: false, message: "brandId is required" });

    const [client, brand] = await Promise.all([
      Client.findById(payload.id).lean(),
      Brand.findById(brandId).lean(),
    ]);

    if (!client) return res.status(404).json({ success: false, message: "Client not found" });
    if (!brand)  return res.status(404).json({ success: false, message: "Brand not found" });

    if (brand.clientId && brand.clientId.toString() !== payload.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const request = await TaskRequest.create({
      clientId:    payload.id,
      brandId:     brandId,
      title:       title.trim(),
      contentType: contentType || "",
      brief:       brief || "",
      needBy:      needBy ? new Date(needBy) : null,
      priority:    priority || "medium",
      referenceLinks: (referenceLinks || []).filter(l => l?.trim()),
      status: "pending",
    });

    const populated = await TaskRequest.findById(request._id)
      .populate("brandId", "name color slug")
      .lean();

    // Notify admin via email (fire-and-forget)
    sendClientRequestEmail({
      clientName:     client.name,
      clientEmail:    client.email,
      brandName:      brand.name,
      title:          title.trim(),
      description:    brief || "",
      service:        contentType || "",
      priority:       priority || "medium",
      referenceLinks: (referenceLinks || []).filter(l => l?.trim()),
    }).catch(e => console.error("[client-requests] email failed:", e.message));

    return res.status(201).json({ success: true, request: populated });
  }

  return res.status(405).end();
}
