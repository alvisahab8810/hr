// GET /api/client/projects?brandSlug=...
// Returns projects for the specific brand of the logged-in client
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";
import Project from "@/models/projects/Project";
import Sprint from "@/models/projects/Sprint";
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
  if (!payload || payload.role !== "client")
    return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  const clientId = mongoose.Types.ObjectId.isValid(payload.id)
    ? new mongoose.Types.ObjectId(payload.id)
    : null;
  if (!clientId) return res.status(400).json({ success: false, message: "Invalid token" });

  try {
    const { brandSlug } = req.query;

    // If brandSlug provided, scope to that specific brand only
    let brandIdFilter = null;
    if (brandSlug) {
      const brand = await Brand.findOne({ slug: brandSlug, clientId }).lean();
      if (!brand) return res.json({ success: true, projects: [], sprints: [], features: [] });
      brandIdFilter = brand._id;
    }

    const query = { clientId, status: { $ne: "cancelled" } };
    if (brandIdFilter) query.brandId = brandIdFilter;

    const projects = await Project.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    if (projects.length === 0)
      return res.json({ success: true, projects: [], sprints: [], features: [] });

    const projectIds = projects.map(p => p._id);

    const [sprints, features] = await Promise.all([
      Sprint.find({ projectId: { $in: projectIds } }).sort({ createdAt: 1 }).lean(),
      Task.find({ taskType: "project", projectId: { $in: projectIds } })
        .populate("assignedTo", "firstName lastName")
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    return res.json({ success: true, projects, sprints, features });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
