// PATCH /api/admin/task-requests/[id]  — review a task request
import { mailTransport, MAIL_FROM, MAIL_USER } from "@/utils/mailer";
import dbConnect from "@/utils/dbConnect";
import TaskRequest from "@/models/TaskRequest";
import AdminUser from "@/models/AdminUser";
import "@/models/clients/Client";
import "@/models/tasks/Brand";
import { sendNotification } from "@/utils/tasks/sendNotification";

function makeT() {
  return mailTransport();
}

async function sendScopeEmail({ clientEmail, clientName, brandName, title, status, adminRemark }) {
  const t = makeT();
  const confirmed = status === "in_scope";
  const subject   = confirmed ? `Task Request In Scope — ${title}` : `Task Request Update — ${title}`;
  const strip     = confirmed
    ? `Great news! Your request is in scope and our team will work on it.`
    : `Your request is currently out of scope. See details below.`;
  const body = confirmed
    ? `<p style="font-size:14px;color:#374151">Hi <strong>${clientName}</strong>,</p>
       <p style="font-size:14px;color:#374151;line-height:1.65">Your task request <strong>"${title}"</strong> from <strong>${brandName}</strong> has been reviewed and marked <strong style="color:#15803D">In Scope</strong>. Our team will schedule and start working on it.</p>
       ${adminRemark ? `<div style="background:#EEF2FF;border-left:4px solid #4F46E5;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0"><div style="font-size:11px;font-weight:700;color:#4F46E5;text-transform:uppercase;margin-bottom:4px">Note from Team</div><div style="font-size:13px;color:#374151">${adminRemark}</div></div>` : ""}`
    : `<p style="font-size:14px;color:#374151">Hi <strong>${clientName}</strong>,</p>
       <p style="font-size:14px;color:#374151;line-height:1.65">After reviewing your request <strong>"${title}"</strong> from <strong>${brandName}</strong>, we've determined it is currently <strong style="color:#DC2626">Out of Scope</strong>.</p>
       ${adminRemark ? `<div style="background:#FEF2F2;border-left:4px solid #DC2626;border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0"><div style="font-size:11px;font-weight:700;color:#DC2626;text-transform:uppercase;margin-bottom:4px">Reason</div><div style="font-size:13px;color:#7F1D1D">${adminRemark}</div></div>` : ""}
       <p style="font-size:13px;color:#374151">Please reach out if you have any questions or if you'd like to discuss alternatives.</p>`;
  await t.sendMail({
    from: `"Viralon Team" <${MAIL_USER}>`,
    to:   clientEmail,
    subject,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
<tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#4F46E5 60%,#7C3AED 100%);padding:28px 32px">
  <div style="font-size:12px;letter-spacing:2px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase">Viralon</div>
  <div style="font-size:20px;font-weight:800;color:#fff;margin-top:6px">${subject}</div>
  <div style="font-size:13px;color:rgba(255,255,255,.65);margin-top:4px">${brandName}</div>
</td></tr>
<tr><td style="background:${confirmed?"#DCFCE7":"#FEE2E2"};border-bottom:1px solid ${confirmed?"#BBF7D0":"#FCA5A5"};padding:12px 32px">
  <span style="font-size:13px;font-weight:700;color:${confirmed?"#15803D":"#DC2626"}">${strip}</span>
</td></tr>
<tr><td style="padding:28px 32px">${body}</td></tr>
<tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center"><div style="font-size:11px;color:#94a3b8">Viralon · info@viralon.in</div></td></tr>
</table></td></tr></table></body></html>`,
  });
}

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

  // Respond immediately, fire notification + email in background
  res.json({ success: true, request });

  if (request.clientId?._id) {
    const statusLabel = status === "in_scope" ? "In Scope" : status === "out_of_scope" ? "Out of Scope" : "Pending";
    sendNotification({
      recipientId: request.clientId._id,
      recipientModel: "Client",
      type: "task_request_reviewed",
      message: `Your request "${request.title}" has been reviewed — ${statusLabel}${adminRemark ? `: ${adminRemark}` : ""}`,
      requestId: request._id,
    }).catch(() => {});

    const clientEmail = request.clientId.email;
    const clientName  = request.clientId.name || clientEmail;
    if (clientEmail && status !== "pending") {
      sendScopeEmail({
        clientEmail,
        clientName,
        brandName:   request.brandId?.name || "",
        title:       request.title,
        status,
        adminRemark: adminRemark || "",
      }).catch(e => console.error("[scope email]", e.message));
    }
  }
}
