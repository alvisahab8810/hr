// POST /api/admin/clients/invite
// Create or update client, link to brand, send invite email
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

async function generateClientId() {
  const last = await Client.findOne({ clientId: /^CLT-/ }).sort({ clientId: -1 }).select("clientId").lean();
  const num = last ? (parseInt(last.clientId.replace("CLT-", ""), 10) || 0) : 0;
  return `CLT-${String(num + 1).padStart(4, "0")}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();

  try {
    const { name, email, password, brandId, sendEmail = true } = req.body;

    if (!name?.trim())     return res.status(400).json({ success: false, message: "Name is required" });
    if (!email?.trim())    return res.status(400).json({ success: false, message: "Email is required" });
    if (!password?.trim()) return res.status(400).json({ success: false, message: "Password is required" });
    if (!brandId)          return res.status(400).json({ success: false, message: "Brand is required" });

    const brand = await Brand.findById(brandId);
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

    // Block early if brand is already linked to a different client
    if (brand.clientId) {
      const emailNorm = email.toLowerCase().trim();
      const existingOwner = await Client.findById(brand.clientId).select("name email").lean();
      if (existingOwner && existingOwner.email !== emailNorm) {
        return res.status(409).json({
          success: false,
          message: `Brand "${brand.name}" is already linked to ${existingOwner.name} (${existingOwner.email}). Please remove them first via Edit Client, then invite again.`,
        });
      }
    }

    const hashed = await bcrypt.hash(password, 10);

    // Upsert client by email
    let client = await Client.findOne({ email: email.toLowerCase().trim() });
    if (client) {
      client.name        = name.trim();
      client.password    = hashed;
      client.passwordSet = true;
      client.status      = "Active";
      await client.save();
    } else {
      const clientId = await generateClientId();
      client = await Client.create({
        clientId,
        name:        name.trim(),
        email:       email.toLowerCase().trim(),
        password:    hashed,
        passwordSet: true,
        status:      "Active",
      });
    }

    // Auto-generate slug from brand name if missing
    if (!brand.slug) {
      brand.slug = brand.name.toLowerCase().trim()
        .replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }

    // Link brand → client: remove client from any old brand they were linked to first
    await Brand.updateMany({ clientId: client._id }, { $set: { clientId: null } });
    brand.clientId = client._id;
    const savedBrand = await brand.save();

    if (!savedBrand.clientId || savedBrand.clientId.toString() !== client._id.toString()) {
      console.error("[invite-client] brand.clientId not saved correctly");
    }

    // Send invite email
    const baseUrl  = process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in";
    const loginUrl = brand.slug ? `${baseUrl}/${brand.slug}/login` : null;

    if (!loginUrl) {
      return res.status(400).json({ success: false, message: "Brand has no slug — please set a slug for this brand in Brand Management first." });
    }

    const year = new Date().getFullYear();
    const logoUrl = `${baseUrl}/assets/images/logo.png`;

    let emailSent = false;
    if (sendEmail) {
      try {
        const transporter = nodemailer.createTransport({
          host: "smtp.hostinger.com",
          port: 587,
          secure: false,
          auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
          tls: { rejectUnauthorized: false },
        });

        await transporter.sendMail({
          from:    `"Viralon" <info@viralon.in>`,
          to:      client.email,
          subject: `Your ${brand.name} client portal is ready — Welcome aboard!`,
          html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to Your Client Portal</title></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:40px 20px">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">

      <!-- HEADER -->
      <tr><td style="background:linear-gradient(135deg,#0F0C29 0%,#1E1B4B 50%,#2d2a6e 100%);border-radius:16px 16px 0 0;padding:0;overflow:hidden">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:36px 40px 0;text-align:center">
              <img src="${logoUrl}" alt="Viralon" width="48" height="48" style="width:48px;height:48px;object-fit:contain;border-radius:10px;margin-bottom:12px" onerror="this.style.display='none'">
              <div style="font-size:22px;font-weight:800;letter-spacing:3px;color:#ffffff;margin-bottom:4px">VIRALON</div>
              <div style="font-size:11px;letter-spacing:2px;color:#02EBAD;text-transform:uppercase;margin-bottom:28px">Digital Growth Partner</div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 36px;text-align:center">
              <div style="display:inline-block;background:rgba(2,235,173,0.12);border:1px solid rgba(2,235,173,0.3);border-radius:20px;padding:5px 16px;margin-bottom:20px">
                <span style="color:#02EBAD;font-size:12px;font-weight:600;letter-spacing:1px">CLIENT PORTAL ACCESS</span>
              </div>
              <h1 style="margin:0 0 10px;font-size:28px;font-weight:700;color:#ffffff;line-height:1.3">Welcome, ${name}!</h1>
              <p style="margin:0;font-size:15px;color:rgba(255,255,255,0.7);line-height:1.6">Your dedicated portal for <strong style="color:#ffffff">${brand.name}</strong> is ready.<br>Everything you need, in one place.</p>
            </td>
          </tr>
          <!-- bottom accent line -->
          <tr><td style="height:4px;background:linear-gradient(90deg,#5A57FB,#02EBAD,#5A57FB)"></td></tr>
        </table>
      </td></tr>

      <!-- BODY -->
      <tr><td style="background:#ffffff;padding:40px">

        <!-- Greeting -->
        <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.7">
          Hi <strong>${name}</strong>,<br><br>
          We're excited to give you access to your dedicated Viralon client portal. Through this portal you can monitor all the work we're doing for <strong>${brand.name}</strong>, communicate with our team, and stay on top of every deliverable.
        </p>

        <!-- Credentials Block -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
          <tr><td colspan="2" style="background:linear-gradient(135deg,#5A57FB,#4845d4);padding:14px 20px">
            <span style="color:#fff;font-size:13px;font-weight:700;letter-spacing:0.5px">🔐 YOUR LOGIN CREDENTIALS</span>
          </td></tr>
          <tr>
            <td style="padding:14px 20px;font-size:13px;font-weight:600;color:#6b7280;border-bottom:1px solid #f3f4f6;width:36%;background:#fafafa">Login Email</td>
            <td style="padding:14px 20px;font-size:14px;color:#111827;font-weight:600;border-bottom:1px solid #f3f4f6;background:#fafafa">${client.email}</td>
          </tr>
          <tr>
            <td style="padding:14px 20px;font-size:13px;font-weight:600;color:#6b7280;background:#ffffff">Password</td>
            <td style="padding:14px 20px;background:#ffffff">
              <span style="font-family:monospace;font-size:15px;font-weight:700;color:#5A57FB;background:#eef2ff;padding:4px 12px;border-radius:6px;letter-spacing:1px">${password}</span>
            </td>
          </tr>
        </table>

        <!-- What you can do -->
        <div style="margin:0 0 28px">
          <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#9ca3af;letter-spacing:1px;text-transform:uppercase">What you can do in your portal</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding:10px 14px 10px 0;vertical-align:top">
                <div style="display:flex;align-items:flex-start">
                  <span style="color:#02EBAD;font-size:18px;margin-right:10px;line-height:1">✓</span>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:2px">Track Deliverables</div>
                    <div style="font-size:12px;color:#6b7280">See real-time status of every task</div>
                  </div>
                </div>
              </td>
              <td width="50%" style="padding:10px 0 10px 14px;vertical-align:top">
                <div style="display:flex;align-items:flex-start">
                  <span style="color:#02EBAD;font-size:18px;margin-right:10px;line-height:1">✓</span>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:2px">Request Work</div>
                    <div style="font-size:12px;color:#6b7280">Submit new task or content requests</div>
                  </div>
                </div>
              </td>
            </tr>
            <tr>
              <td width="50%" style="padding:10px 14px 0 0;vertical-align:top">
                <div style="display:flex;align-items:flex-start">
                  <span style="color:#02EBAD;font-size:18px;margin-right:10px;line-height:1">✓</span>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:2px">Review & Approve</div>
                    <div style="font-size:12px;color:#6b7280">Approve content before it goes live</div>
                  </div>
                </div>
              </td>
              <td width="50%" style="padding:10px 0 0 14px;vertical-align:top">
                <div style="display:flex;align-items:flex-start">
                  <span style="color:#02EBAD;font-size:18px;margin-right:10px;line-height:1">✓</span>
                  <div>
                    <div style="font-size:13px;font-weight:600;color:#111827;margin-bottom:2px">Direct Messaging</div>
                    <div style="font-size:12px;color:#6b7280">Chat directly with your account team</div>
                  </div>
                </div>
              </td>
            </tr>
          </table>
        </div>

        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px">
          <tr><td align="center">
            <a href="${loginUrl}" style="display:inline-block;padding:15px 40px;background:linear-gradient(135deg,#5A57FB,#4845d4);color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.5px">
              Access Your Portal &rarr;
            </a>
          </td></tr>
        </table>

        <!-- Portal URL -->
        <div style="background:#f8fafc;border-radius:8px;padding:12px 16px;margin-bottom:20px;border-left:3px solid #5A57FB">
          <p style="margin:0;font-size:12px;color:#6b7280">Portal URL: <a href="${loginUrl}" style="color:#5A57FB;font-weight:600;text-decoration:none">${loginUrl}</a></p>
        </div>

        <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6">
          Please keep your credentials confidential. We recommend changing your password after your first login. If you have any trouble accessing your portal, reach out to us at <a href="mailto:info@viralon.in" style="color:#5A57FB;text-decoration:none">info@viralon.in</a>
        </p>
      </td></tr>

      <!-- FOOTER -->
      <tr><td style="background:#0F0C29;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center">
        <div style="margin-bottom:10px">
          <span style="font-size:14px;font-weight:800;letter-spacing:2px;color:#ffffff">VIRALON</span>
          <span style="color:rgba(255,255,255,0.3);margin:0 8px">·</span>
          <span style="font-size:12px;color:rgba(255,255,255,0.5)">Digital Growth Partner</span>
        </div>
        <p style="margin:0 0 10px;font-size:11px;color:rgba(255,255,255,0.35)">© ${year} Viralon. All rights reserved.</p>
        <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3)">You received this email because your account was created by the Viralon team.</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error("[invite-client] Email failed:", emailErr.message);
      }
    }

    const { password: _, ...safe } = client.toObject();
    return res.status(201).json({
      success: true,
      client:  safe,
      brand:   { _id: brand._id, name: brand.name, slug: brand.slug },
      loginUrl,
      emailSent,
      message: emailSent
        ? `Invite sent to ${client.email}`
        : `Client created. Email failed — share login URL manually: ${loginUrl}`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
