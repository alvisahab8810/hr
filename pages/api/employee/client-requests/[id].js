// PATCH /api/employee/client-requests/[id]  — DM employee reviews a request (in_scope / out_of_scope)
// POST  /api/employee/client-requests/[id]  — DM employee creates task from in-scope request
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import TaskRequest from "@/models/TaskRequest";
import Task from "@/models/tasks/Task";
import Brand from "@/models/tasks/Brand";
import "@/models/clients/Client";
import { sendNotification } from "@/utils/tasks/sendNotification";
import nodemailer from "nodemailer";

const JWT_SECRET  = process.env.JWT_SECRET || "viralon_invite_secret_2024";
const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const VALID_CT    = ["reel", "post", "carousel", "story"];

function makeTransport() {
  return nodemailer.createTransport({
    host: "smtp.hostinger.com", port: 587, secure: false,
    auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

async function sendScopeEmail({ clientEmail, clientName, brandName, title, status, adminRemark }) {
  if (!clientEmail) return;
  const confirmed = status === "in_scope";
  const subject   = confirmed ? `Task Request In Scope — ${title}` : `Task Request Update — ${title}`;
  const strip     = confirmed
    ? "Great news! Your request is in scope and our team will work on it."
    : "Your request is currently out of scope. See details below.";
  const noteHtml  = adminRemark
    ? `<div style="background:${confirmed?"#EEF2FF":"#FEF2F2"};border-left:4px solid ${confirmed?"#4F46E5":"#DC2626"};border-radius:0 8px 8px 0;padding:12px 16px;margin:16px 0">
        <div style="font-size:11px;font-weight:700;color:${confirmed?"#4F46E5":"#DC2626"};text-transform:uppercase;margin-bottom:4px">Note from Team</div>
        <div style="font-size:13px;color:#374151">${adminRemark}</div>
       </div>`
    : "";
  const body = `<p style="font-size:14px;color:#374151">Hi <strong>${clientName}</strong>,</p>
    <p style="font-size:14px;color:#374151;line-height:1.65">Your task request <strong>"${title}"</strong> from <strong>${brandName}</strong> has been reviewed and marked <strong style="color:${confirmed?"#15803D":"#DC2626"}">${confirmed?"In Scope":"Out of Scope"}</strong>.</p>
    ${noteHtml}`;
  await makeTransport().sendMail({
    from: `"Viralon Team" <info@viralon.in>`,
    to: clientEmail,
    subject,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
<tr><td style="background:linear-gradient(135deg,#1e1b4b,#4F46E5,#7C3AED);padding:28px 32px">
  <div style="font-size:12px;letter-spacing:2px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase">Viralon</div>
  <div style="font-size:20px;font-weight:800;color:#fff;margin-top:6px">${subject}</div>
  <div style="font-size:13px;color:rgba(255,255,255,.65);margin-top:4px">${brandName}</div>
</td></tr>
<tr><td style="background:${confirmed?"#DCFCE7":"#FEE2E2"};padding:12px 32px">
  <span style="font-size:13px;font-weight:700;color:${confirmed?"#15803D":"#DC2626"}">${strip}</span>
</td></tr>
<tr><td style="padding:28px 32px">${body}</td></tr>
<tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center">
  <div style="font-size:11px;color:#94a3b8">Viralon · info@viralon.in</div>
</td></tr>
</table></td></tr></table></body></html>`,
  });
}

async function verifyDmEmployee(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    const emp = await Employee.findById(payload.id).select("professional firstName lastName").lean();
    if (!emp) return null;
    const dept = (emp.professional?.department || "").toLowerCase();
    const isDm = dept.includes("digital") || dept.includes("marketing");
    if (!isDm) return null;
    return emp;
  } catch { return null; }
}

export default async function handler(req, res) {
  await dbConnect();
  const emp = await verifyDmEmployee(req);
  if (!emp) return res.status(403).json({ success: false, message: "Access restricted to Digital Marketing team" });

  const { id } = req.query;

  /* ── PATCH: review (in_scope / out_of_scope) ── */
  if (req.method === "PATCH") {
    const { status, adminRemark } = req.body;
    if (!["in_scope", "out_of_scope", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }
    const request = await TaskRequest.findByIdAndUpdate(
      id,
      { $set: { status, adminRemark: adminRemark || "", reviewedAt: new Date() } },
      { new: true }
    )
      .populate("clientId", "name email")
      .populate("brandId", "name color slug")
      .lean();
    if (!request) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true, request });
    if (request.clientId?._id && status !== "pending") {
      const statusLabel = status === "in_scope" ? "In Scope" : "Out of Scope";
      sendNotification({
        recipientId: request.clientId._id, recipientModel: "Client",
        type: "task_request_reviewed",
        message: `Your request "${request.title}" has been reviewed — ${statusLabel}${adminRemark ? `: ${adminRemark}` : ""}`,
        requestId: request._id,
      }).catch(() => {});
      sendScopeEmail({
        clientEmail: request.clientId.email,
        clientName:  request.clientId.name || request.clientId.email,
        brandName:   request.brandId?.name || "",
        title:       request.title, status,
        adminRemark: adminRemark || "",
      }).catch(() => {});
    }
    return;
  }

  /* ── POST: create task from in-scope request ── */
  if (req.method === "POST") {
    const {
      taskType = "production",
      taskTitle, contentType, stages,
      // SEO
      seoCategory, primaryKeywords, pageUrls, description, dueDate,
      internalLinking, internalLinkingTask, externalLinking, externalLinkingTask,
      // General/Ads/Branding
      title, priority, assignedTo,
    } = req.body;

    const request = await TaskRequest.findById(id)
      .populate("clientId", "name email")
      .populate("brandId", "name color slug")
      .lean();
    if (!request) return res.status(404).json({ success: false, message: "Not found" });

    const brand   = request.brandId;
    const brandId = brand?._id;

    /* ── Production (Social Media) ── */
    if (taskType === "production") {
      if (!taskTitle?.trim()) return res.status(400).json({ success: false, message: "taskTitle required" });
      const prefix     = (brand?.name || "XX").replace(/\s+/g, "").slice(0, 2).toUpperCase();
      const brandCount = brandId ? await Task.countDocuments({ brandId }) : await Task.countDocuments({ brandId: null });
      const taskId     = brandId ? `${prefix}${String(brandCount + 1).padStart(3, "0")}` : `T${String(brandCount + 1).padStart(4, "0")}`;
      let nomenclature = "";
      const ct = VALID_CT.includes(contentType) ? contentType : "";
      if (ct && brandId) {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const count = await Task.countDocuments({ brandId, contentType: ct, createdAt: { $gte: monthStart, $lte: monthEnd } });
        nomenclature = `${ct}${count + 1} ${MONTH_SHORT[now.getMonth()]}'${String(now.getFullYear()).slice(2)}`;
      }
      const stagesArr       = Array.isArray(stages) ? stages : [];
      const firstAssignees  = stagesArr[0]?.assignedTo;
      const primaryAssignee = Array.isArray(firstAssignees) ? firstAssignees[0] : firstAssignees || null;
      const primaryDueDate  = stagesArr[stagesArr.length - 1]?.deadline || null;
      const task = await Task.create({
        title:       taskTitle.trim() || nomenclature,
        description: request.brief || "",
        taskType:    "production",
        priority:    request.priority || "medium",
        assignedTo:  primaryAssignee || null,
        clientId:    request.clientId?._id || null,
        brandId:     brandId || null,
        contentType: ct,
        nomenclature, taskId,
        dueDate:     primaryDueDate || null,
        stage: "S1",
        stages: stagesArr.map(s => ({
          name:       s.name || "",
          assignedTo: Array.isArray(s.assignedTo) ? s.assignedTo.filter(Boolean) : [],
          deadline:   s.deadline || null,
        })),
      });
      return res.status(201).json({ success: true, task: { _id: task._id, taskId: task.taskId, title: task.title } });
    }

    /* ── SEO ── */
    if (taskType === "seo") {
      const resolvedTitle = (taskTitle || title || "").trim() || `SEO — ${seoCategory || "task"}`;
      const task = await Task.create({
        title:       resolvedTitle,
        description: description || request.brief || "",
        taskType:    "seo",
        seoCategory: seoCategory || "blog",
        primaryKeywords: primaryKeywords || "",
        pageUrls:    Array.isArray(pageUrls) ? pageUrls.filter(Boolean) : [],
        internalLinking:     internalLinking || false,
        internalLinkingTask: internalLinkingTask || "",
        externalLinking:     externalLinking || false,
        externalLinkingTask: externalLinkingTask || "",
        priority:    priority || request.priority || "medium",
        assignedTo:  assignedTo || null,
        clientId:    request.clientId?._id || null,
        brandId:     brandId || null,
        dueDate:     dueDate ? new Date(dueDate) : null,
      });
      return res.status(201).json({ success: true, task: { _id: task._id, title: task.title } });
    }

    /* ── Ads / Branding / General ── */
    if (["ads", "branding", "general"].includes(taskType)) {
      const resolvedTitle = (taskTitle || title || "").trim() || request.title;
      if (!resolvedTitle) return res.status(400).json({ success: false, message: "title required" });
      const task = await Task.create({
        title:       resolvedTitle,
        description: description || request.brief || "",
        taskType,
        priority:    priority || request.priority || "medium",
        assignedTo:  assignedTo || null,
        clientId:    request.clientId?._id || null,
        brandId:     brandId || null,
        dueDate:     dueDate ? new Date(dueDate) : null,
      });
      return res.status(201).json({ success: true, task: { _id: task._id, title: task.title } });
    }

    return res.status(400).json({ success: false, message: "Invalid taskType" });
  }

  return res.status(405).end();
}
