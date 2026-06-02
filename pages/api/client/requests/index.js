// GET  /api/client/requests?brandSlug=...  — list client's requests
// POST /api/client/requests                — create new request
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dbConnect from "@/utils/dbConnect";
import TaskRequest from "@/models/TaskRequest";
import Brand from "@/models/tasks/Brand";
import AdminUser from "@/models/AdminUser";
import Client from "@/models/clients/Client";
import { sendNotification } from "@/utils/tasks/sendNotification";

const CONTENT_LABELS = { socialMedia:"Social Media", website:"Web Development", seo:"SEO", ads:"Ad Campaigns", branding:"Branding" };
const PRIORITY_LABELS = { low:"Low", medium:"Medium", high:"High", urgent:"Urgent" };

function makeT() {
  return nodemailer.createTransport({
    host:"smtp.hostinger.com", port:587, secure:false,
    auth:{ user:"info@viralon.in", pass:process.env.EMAIL_PASS },
    tls:{ rejectUnauthorized:false },
  });
}

function reqEmailBody(data) {
  const { clientName, brandName, title, contentType, priority, needBy, brief, referenceLinks } = data;
  return `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:5px 0;font-size:13px;color:#6B7280;width:35%">Client</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#0f172a">${clientName}</td></tr>
      <tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Brand</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#0f172a">${brandName}</td></tr>
      <tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Service</td><td style="padding:5px 0;font-size:13px;color:#374151">${CONTENT_LABELS[contentType]||contentType||"—"}</td></tr>
      <tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Priority</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#4F46E5">${PRIORITY_LABELS[priority]||priority||"Medium"}</td></tr>
      ${needBy ? `<tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Need by</td><td style="padding:5px 0;font-size:13px;color:#374151">${new Date(needBy).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}</td></tr>` : ""}
      ${brief ? `<tr><td style="padding:5px 0;font-size:13px;color:#6B7280;vertical-align:top">Brief</td><td style="padding:5px 0;font-size:13px;color:#374151;line-height:1.6">${brief.slice(0,400)}</td></tr>` : ""}
    </table>
    ${referenceLinks?.length ? `<div style="margin-top:10px">${referenceLinks.map(l=>`<a href="${l}" style="display:block;font-size:12px;color:#5A57FB;font-weight:600;text-decoration:none;margin-bottom:3px">🔗 ${l}</a>`).join("")}</div>` : ""}`;
}

function wrapEmail(headerText, stripHtml, body) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
<tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#4F46E5 60%,#7C3AED 100%);padding:28px 32px">
  <div style="font-size:12px;letter-spacing:2px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase">Viralon</div>
  <div style="font-size:20px;font-weight:800;color:#fff;margin-top:6px">${headerText}</div>
</td></tr>
${stripHtml ? `<tr><td style="background:#DCFCE7;border-bottom:1px solid #BBF7D0;padding:12px 32px"><span style="font-size:13px;font-weight:700;color:#15803D">${stripHtml}</span></td></tr>` : ""}
<tr><td style="padding:28px 32px">${body}</td></tr>
<tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center"><div style="font-size:11px;color:#94a3b8">Viralon · info@viralon.in</div></td></tr>
</table></td></tr></table></body></html>`;
}

async function sendRequestEmails({ clientEmail, clientName, brandName, title, contentType, priority, needBy, brief, referenceLinks }) {
  const t = makeT();
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://payroll.viralon.in";
  const details = reqEmailBody({ clientName, brandName, title, contentType, priority, needBy, brief, referenceLinks });

  // Email to Anurag
  t.sendMail({
    from: `"Viralon Client Portal" <info@viralon.in>`,
    to:   "anurag@viralon.in",
    subject: `📋 New Task Request — ${brandName}: ${title}`,
    html: wrapEmail(
      `📋 New Task Request`,
      `⚡ Action needed — review and scope this request`,
      `<p style="margin:0 0 16px;font-size:14px;color:#374151">Hi Anurag, a new task request has been submitted.</p>
       <div style="background:#EEF2FF;border:1.5px solid #C7D2FE;border-radius:10px;padding:16px 20px;margin-bottom:20px">
         <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:10px">${title}</div>
         ${details}
       </div>
       <div style="text-align:center"><a href="${base}/dashboard/admin/task-requests" style="display:inline-block;padding:12px 28px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:14px">Review Request →</a></div>`
    ),
  }).catch(e => console.error("[request email anurag]", e.message));

  // Confirmation to client
  if (clientEmail) {
    t.sendMail({
      from: `"Viralon Team" <info@viralon.in>`,
      to:   clientEmail,
      subject: `✅ Request Received — ${title}`,
      html: wrapEmail(
        `✅ Request Received`,
        `🎉 Your request has been received! We'll review it shortly.`,
        `<p style="margin:0 0 16px;font-size:14px;color:#374151">Hi <strong>${clientName}</strong>,</p>
         <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.65">We've received your task request. Our team will review it and confirm whether it's in scope. You'll be notified once we've had a chance to look at it.</p>
         <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:10px;padding:16px 20px;margin-bottom:20px">
           <div style="font-size:16px;font-weight:800;color:#0f172a;margin-bottom:10px">${title}</div>
           ${details}
         </div>`
      ),
    }).catch(e => console.error("[request email client]", e.message));
  }
}

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

    // Notify all admins (in-app)
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

    // Respond immediately, fire emails in background
    res.status(201).json({ success: true, request });

    const client = await Client.findById(payload.id).lean();
    sendRequestEmails({
      clientEmail:    client?.email || "",
      clientName:     client?.name  || payload.email,
      brandName:      brand.name,
      title:          title.trim(),
      contentType:    contentType || "",
      priority:       priority || "medium",
      needBy:         needBy || null,
      brief:          brief  || "",
      referenceLinks: Array.isArray(referenceLinks) ? referenceLinks.filter(Boolean) : [],
    });
    return;
  }

  return res.status(405).end();
}
