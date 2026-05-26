// PATCH /api/admin/task-requests/[id]  — review a task request
import dbConnect from "@/utils/dbConnect";
import TaskRequest from "@/models/TaskRequest";
import AdminUser from "@/models/AdminUser";
import "@/models/clients/Client";
import "@/models/tasks/Brand";
import { sendNotification } from "@/utils/tasks/sendNotification";

function getAdminId(req) {
  const cookie = req.headers.cookie || "";
  // Admin auth uses admin_auth=true; also try to grab admin_id if set
  if (!cookie.includes("admin_auth=true")) return null;
  const m = cookie.match(/admin_id=([^;]+)/);
  return m ? m[1] : "admin";
}

import { adminGuard, getAdminUserPayload } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();
  const { id } = req.query;
  const { status, adminRemark, quoteAmount } = req.body;

  if (!["in_scope", "out_of_scope", "pending"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  // Find first admin to use as reviewedBy
  const admin = await AdminUser.findOne({}).select("_id name").lean();

  const request = await TaskRequest.findByIdAndUpdate(
    id,
    {
      $set: {
        status,
        adminRemark: adminRemark || "",
        quoteAmount: quoteAmount != null ? Number(quoteAmount) : null,
        reviewedBy: admin?._id || null,
        reviewedAt: new Date(),
      },
    },
    { new: true }
  )
    .populate("clientId", "name email")
    .populate("brandId", "name color slug")
    .lean();

  if (!request) return res.status(404).json({ success: false, message: "Request not found" });

  // Notify client
  if (request.clientId?._id) {
    const statusLabel = status === "in_scope" ? "In Scope ✓" : status === "out_of_scope" ? "Out of Scope" : "Pending";
    await sendNotification({
      recipientId: request.clientId._id,
      recipientModel: "Client",
      type: "task_request_reviewed",
      message: `Your request "${request.title}" has been reviewed — ${statusLabel}${adminRemark ? `: ${adminRemark}` : ""}`,
      requestId: request._id,
    });
  }

  return res.json({ success: true, request });
}
