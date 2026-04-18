// utils/email/inviteEmail.js
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false },
});

export async function sendInviteEmail({ to, name, role, setPasswordUrl }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(99,102,241,0.12)">

        <!-- Header gradient -->
        <tr>
          <td style="background:linear-gradient(135deg,#4F46E5 0%,#818CF8 100%);padding:36px 32px;text-align:center">
            <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:rgba(255,255,255,.18);border-radius:16px;margin-bottom:16px">
              <span style="font-size:28px">🛡️</span>
            </div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.3px">
              You're Invited!
            </h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,.85);font-size:14px">
              Viralon Payroll Admin Panel
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px">
            <p style="margin:0 0 8px;font-size:16px;color:#111827">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.7">
              You have been invited to join <strong style="color:#111827">Viralon Payroll</strong> as a
              <strong style="color:#4F46E5">${role}</strong>.<br>
              Click the button below to set your password and activate your account.
            </p>

            <!-- CTA Button -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
              <tr>
                <td align="center">
                  <a href="${setPasswordUrl}" target="_blank"
                    style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#818CF8);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:12px;letter-spacing:0.2px">
                    Set Password
                  </a>
                </td>
              </tr>
            </table>

            <!-- Expiry note -->
            <div style="background:#FEF3C7;border:1.5px solid #FDE68A;border-radius:10px;padding:12px 16px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:#92400E">
                ⏱️ This link is valid for <strong>24 hours</strong>. After that you'll need to contact your admin for a new invite.
              </p>
            </div>

            <p style="margin:0;font-size:13px;color:#9CA3AF">
              If you did not expect this email, you can safely ignore it.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #F1F5F9;padding:20px 36px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9CA3AF">— Viralon Team</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    '"Viralon Payroll" <info@viralon.in>',
    to,
    subject: "You are invited to Viralon Payroll Admin Panel",
    html,
  });
}
