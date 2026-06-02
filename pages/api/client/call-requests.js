// GET  /api/client/call-requests?brand=slug  — list call requests for brand
// POST /api/client/call-requests?brand=slug  — create a new call/meeting request
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";
import CallRequest from "@/models/CallRequest";

function getClientPayload(req) {
  const cookie = req.headers.cookie || "";
  const match  = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

function makeTransporter() {
  return nodemailer.createTransport({
    host: "smtp.hostinger.com", port: 587, secure: false,
    auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });
}

const detailsTable = ({ clientName, brandName, preferredDate, preferredTime, note }) => `
  <div style="background:#EEF2FF;border:1.5px solid #C7D2FE;border-radius:10px;padding:18px 20px;margin-bottom:22px">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:5px 0;font-size:13px;color:#6B7280;width:40%">Client</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#0f172a">${clientName}</td></tr>
      <tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Brand</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#0f172a">${brandName}</td></tr>
      <tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Preferred Date</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#4F46E5">${preferredDate}</td></tr>
      <tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Preferred Time</td><td style="padding:5px 0;font-size:13px;font-weight:700;color:#4F46E5">${preferredTime}</td></tr>
      ${note ? `<tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Note</td><td style="padding:5px 0;font-size:13px;color:#374151">${note}</td></tr>` : ""}
    </table>
  </div>`;

const emailWrapper = (body) => `
<!DOCTYPE html><html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">
      ${body}
      <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:14px 32px;text-align:center">
        <div style="font-size:11px;color:#94a3b8">Viralon · info@viralon.in</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

async function notifyAnurag({ clientName, brandName, preferredDate, preferredTime, note, base }) {
  const t = makeTransporter();
  await t.sendMail({
    from:    `"Viralon Client Portal" <info@viralon.in>`,
    to:      "anurag@viralon.in",
    subject: `📞 Call / Meeting Request — ${brandName}`,
    html: emailWrapper(`
      <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#4F46E5 60%,#7C3AED 100%);padding:28px 32px;">
        <div style="font-size:12px;letter-spacing:2px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;">Viralon</div>
        <div style="font-size:20px;font-weight:800;color:#fff;margin-top:6px;">📞 New Call / Meeting Request</div>
        <div style="font-size:13px;color:rgba(255,255,255,.65);margin-top:4px;">Action needed — review and confirm</div>
      </td></tr>
      <tr><td style="padding:28px 32px">
        <p style="margin:0 0 16px;font-size:14px;color:#374151">Hi Anurag,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.65">
          <strong>${clientName}</strong> from <strong>${brandName}</strong> has requested a call/meeting.
        </p>
        ${detailsTable({ clientName, brandName, preferredDate, preferredTime, note })}
        <div style="text-align:center">
          <a href="${base}/employee/messages" style="display:inline-block;padding:12px 32px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:14px;">
            Review in Messages →
          </a>
        </div>
      </td></tr>`),
  });
}

async function confirmToClient({ clientEmail, clientName, brandName, preferredDate, preferredTime, note }) {
  const t = makeTransporter();
  await t.sendMail({
    from:    `"Viralon Team" <info@viralon.in>`,
    to:      clientEmail,
    subject: `📞 Call Request Received — ${brandName}`,
    html: emailWrapper(`
      <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#4F46E5 60%,#7C3AED 100%);padding:28px 32px;">
        <div style="font-size:12px;letter-spacing:2px;font-weight:700;color:rgba(255,255,255,.5);text-transform:uppercase;">Viralon</div>
        <div style="font-size:20px;font-weight:800;color:#fff;margin-top:6px;">📞 Call Request Received</div>
        <div style="font-size:13px;color:rgba(255,255,255,.65);margin-top:4px;">${brandName}</div>
      </td></tr>
      <tr><td style="background:#DCFCE7;border-bottom:1px solid #BBF7D0;padding:12px 32px">
        <span style="font-size:13px;font-weight:700;color:#15803D;">✅ Your request has been received. Anurag will confirm shortly.</span>
      </td></tr>
      <tr><td style="padding:28px 32px">
        <p style="margin:0 0 16px;font-size:14px;color:#374151">Hi <strong>${clientName}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.65">
          We received your call/meeting request. Our team will review and confirm the timing soon.
        </p>
        ${detailsTable({ clientName, brandName, preferredDate, preferredTime, note })}
      </td></tr>`),
  });
}

export default async function handler(req, res) {
  const payload = getClientPayload(req);
  if (!payload || payload.role !== "client")
    return res.status(401).json({ success: false });

  await dbConnect();

  const client = await Client.findById(payload.id).lean();
  if (!client) return res.status(404).json({ success: false });

  const { brand: brandSlug } = req.query;
  const brand = await Brand.findOne({ slug: brandSlug, clientId: client._id }).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  if (req.method === "GET") {
    const requests = await CallRequest.find({ brandId: brand._id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, requests });
  }

  if (req.method === "POST") {
    const { preferredDate, preferredTime, note } = req.body || {};
    if (!preferredDate || !preferredTime)
      return res.status(400).json({ success: false, message: "Date and time are required" });

    const request = await CallRequest.create({
      brandId:       brand._id,
      clientId:      client._id,
      clientName:    client.name || client.email,
      brandName:     brand.name,
      brandSlug:     brand.slug,
      preferredDate,
      preferredTime,
      note:          (note || "").trim(),
    });

    // Respond immediately — don't wait for emails
    res.status(201).json({ success: true, request });

    const base       = process.env.NEXT_PUBLIC_BASE_URL || "https://payroll.viralon.in";
    const clientName = client.name || client.email;
    const clientEmail = client.email;
    const emailArgs  = { clientName, brandName: brand.name, preferredDate, preferredTime, note: note || "" };

    notifyAnurag({ ...emailArgs, base })
      .catch(e => console.error("[call-requests] Anurag email error:", e.message));

    if (clientEmail) {
      confirmToClient({ ...emailArgs, clientEmail })
        .catch(e => console.error("[call-requests] Client email error:", e.message));
    }

    return;
  }

  return res.status(405).end();
}
