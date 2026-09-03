// PATCH /api/employee/call-requests/[id] — approve / reject / schedule
import jwt from "jsonwebtoken";
import { mailTransport, MAIL_FROM, MAIL_USER } from "@/utils/mailer";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Client from "@/models/clients/Client";
import CallRequest from "@/models/CallRequest";

function verifyToken(req) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

async function sendActionEmail({ clientEmail, clientName, brandName, action, preferredDate, preferredTime, scheduledDate, scheduledTime, adminNote }) {
  const transporter = mailTransport();

  const confirmed = action !== "rejected";
  const title = confirmed ? "Call / Meeting Confirmed" : "Call Request Update";
  const confDate = scheduledDate || preferredDate;
  const confTime = scheduledTime || preferredTime;

  const strip = confirmed
    ? `<tr><td style="background:#DCFCE7;border-bottom:1px solid #BBF7D0;padding:12px 32px"><span style="font-size:13px;font-weight:700;color:#15803D;">Your call/meeting has been confirmed!</span></td></tr>`
    : `<tr><td style="background:#FFF7ED;border-bottom:1px solid #FED7AA;padding:12px 32px"><span style="font-size:13px;font-weight:700;color:#C2410C;">Please suggest a new time — we'd love to connect!</span></td></tr>`;

  const body = confirmed ? `
    <p style="margin:0 0 16px;font-size:14px;color:#374151">Hi <strong>${clientName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.65">Your call/meeting request has been <strong style="color:#059669">confirmed</strong>.</p>
    <div style="background:#F0FDF4;border:1.5px solid #BBF7D0;border-radius:10px;padding:18px 20px;margin-bottom:22px">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:5px 0;font-size:13px;color:#6B7280;width:40%">Date</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#059669">${confDate}</td></tr>
        <tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Time</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#059669">${confTime}</td></tr>
        ${adminNote ? `<tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Note from Anurag</td><td style="padding:5px 0;font-size:13px;color:#374151">${adminNote}</td></tr>` : ""}
      </table>
    </div>` : `
    <p style="margin:0 0 16px;font-size:14px;color:#374151">Hi <strong>${clientName}</strong>,</p>
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.65">We appreciate you reaching out! Unfortunately, we are unable to make it on <strong>${preferredDate}</strong> at <strong>${preferredTime}</strong>. We'd love to reschedule at your convenience.</p>
    ${adminNote ? `<div style="background:#FFF7ED;border-left:4px solid #F97316;border-radius:0 8px 8px 0;padding:12px 16px;margin-bottom:16px"><div style="font-size:11px;font-weight:700;color:#C2410C;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Message from Anurag</div><div style="font-size:14px;color:#7C2D12;line-height:1.65">${adminNote}</div></div>` : ""}
    <p style="font-size:13px;color:#374151;line-height:1.65">Please use the client portal to submit a new request with a different date and time. We look forward to connecting with you!</p>
    <div style="text-align:center;margin-top:16px"><a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in"}/tourwatchout" style="display:inline-block;padding:10px 24px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:13px">Request New Time →</a></div>`;

  await transporter.sendMail({
    from:    `"Viralon Team" <${MAIL_USER}>`,
    to:      clientEmail,
    subject: `${title} — ${brandName}`,
    html: `
<!DOCTYPE html><html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#4F46E5 60%,#7C3AED 100%);padding:28px 32px;">
        <div style="font-size:12px;letter-spacing:2px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;">Viralon</div>
        <div style="font-size:20px;font-weight:800;color:#fff;margin-top:6px;">${title}</div>
        <div style="font-size:13px;color:rgba(255,255,255,.65);margin-top:4px;">${brandName}</div>
      </td></tr>
      ${strip}
      <tr><td style="padding:28px 32px">${body}</td></tr>
      <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center">
        <div style="font-size:11px;color:#94a3b8">Viralon · info@viralon.in</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`,
  });
}

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false });

  await dbConnect();
  const emp = await Employee.findById(payload.id).lean();
  if (!emp) return res.status(404).json({ success: false });
  const dept = (emp.professional?.department || "").toLowerCase();
  if (!dept.includes("digital") && !dept.includes("marketing"))
    return res.status(403).json({ success: false });

  const { id } = req.query;
  const { action, scheduledDate, scheduledTime, adminNote, meetingLink } = req.body || {};

  if (!["approved", "rejected", "scheduled"].includes(action))
    return res.status(400).json({ success: false, message: "Invalid action" });

  const callReq = await CallRequest.findById(id);
  if (!callReq) return res.status(404).json({ success: false, message: "Request not found" });

  callReq.status    = action;
  if (scheduledDate)            callReq.scheduledDate = scheduledDate;
  if (scheduledTime)            callReq.scheduledTime = scheduledTime;
  if (adminNote !== undefined)  callReq.adminNote     = adminNote;
  if (meetingLink !== undefined) callReq.meetingLink  = meetingLink;
  await callReq.save();

  // Respond immediately — email fires in background
  res.json({ success: true, request: callReq.toObject() });

  Client.findById(callReq.clientId).lean().then(client => {
    const clientEmail = client?.email;
    if (clientEmail) {
      sendActionEmail({
        clientEmail,
        clientName:    callReq.clientName,
        brandName:     callReq.brandName,
        action,
        preferredDate: callReq.preferredDate,
        preferredTime: callReq.preferredTime,
        scheduledDate: callReq.scheduledDate,
        scheduledTime: callReq.scheduledTime,
        adminNote:     callReq.adminNote,
      }).catch(e => console.error("[call-requests] Action email error:", e.message));
    }
  }).catch(e => console.error("[call-requests] Client lookup error:", e.message));
}
