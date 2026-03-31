import nodemailer from "nodemailer";

export async function sendLunchReminderEmail({ to, name, minutes, exceeded }) {
  const mins     = Math.round(Number(minutes))  || 0;
  const excMin   = Math.round(Number(exceeded)) || Math.max(0, mins - 45);
  const deduction = excMin * 5;

  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 587,
    secure: false,
    auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#F3F4F6">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#EF4444,#DC2626);padding:28px 32px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">⏰</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">Lunch Break Exceeded</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Payroll deduction may apply</p>
          </td>
        </tr>

        <!-- Alert bar -->
        <tr>
          <td style="background:#FEF2F2;border-bottom:1px solid #FECACA;padding:12px 32px;text-align:center">
            <p style="margin:0;font-size:13px;font-weight:700;color:#DC2626">
              ⚠️ You were on lunch for <span style="font-size:16px">${mins} minutes</span>${excMin > 0 ? ` — ${excMin} min over the 45-min limit` : ""}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 14px;font-size:15px;color:#374151">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6B7280;line-height:1.7">
              Your lunch break today exceeded the allowed <strong style="color:#DC2626">45 minutes</strong>.
              Please review your attendance tracker and contact HR if you have any concerns.
            </p>

            <!-- Stats -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
              <tr>
                <td width="33%" style="padding:4px">
                  <div style="background:#FEF2F2;border-radius:10px;padding:14px;text-align:center">
                    <div style="font-size:20px;font-weight:800;color:#DC2626">${mins} min</div>
                    <div style="font-size:11px;color:#9CA3AF;margin-top:3px">Total break</div>
                  </div>
                </td>
                <td width="33%" style="padding:4px">
                  <div style="background:#FEF3C7;border-radius:10px;padding:14px;text-align:center">
                    <div style="font-size:20px;font-weight:800;color:#D97706">45 min</div>
                    <div style="font-size:11px;color:#9CA3AF;margin-top:3px">Allowed</div>
                  </div>
                </td>
                <td width="33%" style="padding:4px">
                  <div style="background:#FEE2E2;border-radius:10px;padding:14px;text-align:center">
                    <div style="font-size:20px;font-weight:800;color:#EF4444">${excMin > 0 ? "+" + excMin : "0"} min</div>
                    <div style="font-size:11px;color:#9CA3AF;margin-top:3px">Exceeded</div>
                  </div>
                </td>
              </tr>
            </table>

            ${deduction > 0 ? `
            <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:12px;padding:14px 18px;margin-bottom:20px">
              <p style="margin:0;font-size:13px;color:#92400E;line-height:1.6">
                💰 <strong>Deduction applied:</strong> ₹${deduction} has been noted for ${excMin} extra minutes
                (₹5/min policy). This will reflect in your payslip.
              </p>
            </div>` : ""}

            <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6">
              This is an automated message from the Viralon attendance system. Please do not reply.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#F9FAFB;border-top:1px solid #F3F4F6;padding:16px 32px;text-align:center">
            <p style="margin:0;font-size:12px;color:#9CA3AF">
              © ${new Date().getFullYear()} Viralon HR &nbsp;·&nbsp; Automated Attendance System
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Viralon HR" <info@viralon.in>`,
    to,
    subject: `⏰ Lunch Exceeded — ${mins} min${excMin > 0 ? ` (${excMin} min over, ₹${deduction} deduction)` : ""}`,
    html,
  });
}
