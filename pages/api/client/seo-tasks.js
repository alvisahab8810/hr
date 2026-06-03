// GET /api/client/seo-tasks?brandSlug=...
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";
import Task from "@/models/tasks/Task";
import Client from "@/models/clients/Client";

function getClientPayload(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

const STATUS_LABEL = {
  todo:        "To Do",
  in_progress: "In Progress",
  review:      "Under Review",
  completed:   "Completed",
  blocked:     "On Hold",
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const payload = getClientPayload(req);
  if (!payload || payload.role !== "client")
    return res.status(401).json({ success: false });

  await dbConnect();

  const client = await Client.findById(payload.id).lean();
  if (!client) return res.status(404).json({ success: false });

  const { brandSlug } = req.query;
  if (!brandSlug) return res.status(400).json({ success: false, message: "brandSlug required" });

  const brand = await Brand.findOne({ slug: brandSlug, clientId: client._id }).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  const tasks = await Task.find({
    brandId: brand._id,
    tags:    "seo",
  })
    .select("title taskId nomenclature status dueDate seoCategory createdAt updatedAt")
    .sort({ createdAt: -1 })
    .lean();

  // Return only client-safe fields — no assignee info
  const safe = tasks.map(t => ({
    _id:         t._id,
    taskId:      t.taskId,
    title:       t.nomenclature || t.title,
    status:      t.status,
    statusLabel: STATUS_LABEL[t.status] || t.status,
    seoCategory: t.seoCategory || "general",
    dueDate:     t.dueDate,
    createdAt:   t.createdAt,
  }));

  return res.json({ success: true, tasks: safe });
}
