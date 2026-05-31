// POST /api/admin/clients/[id]/reinvite
// Reset password and optionally re-send invite email
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();
  const { id } = req.query;
  const { password, sendEmail = true } = req.body;

  if (!password?.trim()) return res.status(400).json({ success: false, message: "Password is required" });

  try {
    const client = await Client.findById(id);
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    // Update password
    client.password    = await bcrypt.hash(password, 10);
    client.passwordSet = true;
    await client.save();

    // Find linked brand for the portal URL
    const brand = await Brand.findOne({ clientId: id }).lean();
    const baseUrl  = process.env.NEXT_PUBLIC_APP_URL || "https://viralon.in";
    const loginUrl = brand?.slug ? `${baseUrl}/${brand.slug}/login` : null;

    let emailSent = false;
    if (sendEmail && loginUrl) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.hostinger.com", port: 587, secure: false,
          auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
          tls: { rejectUnauthorized: false },
        });
        await transporter.sendMail({
          from:    `"Viralon" <info@viralon.in>`,
          to:      client.email,
          subject: `Your ${brand?.name || "Viralon"} portal credentials have been updated`,
          html: `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:520px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0F0C29,#2d2a6e);padding:28px 32px;text-align:center">
    <div style="font-size:20px;font-weight:800;letter-spacing:2px;color:#fff;margin-bottom:4px">VIRALON</div>
    <div style="font-size:11px;color:#02EBAD;letter-spacing:1px">CLIENT PORTAL — CREDENTIAL UPDATE</div>
  </div>
  <div style="padding:32px">
    <p style="color:#374151;font-size:15px">Hi <strong>${client.name}</strong>,</p>
    <p style="color:#374151;font-size:14px;line-height:1.6">Your portal credentials for <strong>${brand?.name || "your brand"}</strong> have been updated by the Viralon team.</p>
    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:24px 0">
      <div style="background:linear-gradient(135deg,#5A57FB,#4845d4);padding:12px 18px">
        <span style="color:#fff;font-size:12px;font-weight:700">🔐 YOUR UPDATED CREDENTIALS</span>
      </div>
      <div style="padding:16px 18px">
        <div style="margin-bottom:10px"><span style="font-size:12px;color:#6b7280">Username / Email:</span><br><span style="font-size:14px;font-weight:600;color:#111827">${client.email}</span></div>
        <div><span style="font-size:12px;color:#6b7280">Password:</span><br><span style="font-family:monospace;font-size:15px;font-weight:700;color:#5A57FB;background:#eef2ff;padding:3px 10px;border-radius:5px">${password}</span></div>
      </div>
    </div>
    ${loginUrl ? `<div style="text-align:center;margin:24px 0"><a href="${loginUrl}" style="display:inline-block;padding:13px 32px;background:linear-gradient(135deg,#5A57FB,#4845d4);color:#fff;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px">Access Portal →</a></div>` : ""}
    <p style="color:#9ca3af;font-size:12px;line-height:1.6">If you have any issues, contact us at <a href="mailto:info@viralon.in" style="color:#5A57FB">info@viralon.in</a></p>
  </div>
</div>`,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("[reinvite] Email failed:", emailErr.message);
      }
    }

    return res.json({
      success: true,
      emailSent,
      loginUrl,
      message: emailSent ? `Credentials email sent to ${client.email}` : "Password updated (email not sent)",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
