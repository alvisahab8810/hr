// GET /api/admin/task-requests?status=pending&brandId=...
import dbConnect from "@/utils/dbConnect";
import TaskRequest from "@/models/TaskRequest";
import "@/models/clients/Client";
import "@/models/tasks/Brand";

import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();

  const { status, brandId } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (brandId) filter.brandId = brandId;

  const requests = await TaskRequest.find(filter)
    .sort({ createdAt: -1 })
    .populate("clientId", "name email")
    .populate("brandId", "name color slug")
    .populate("reviewedBy", "name email")
    .lean();

  return res.json({ success: true, requests });
}
