import { mailTransport, MAIL_FROM, MAIL_USER } from "@/utils/mailer";

const transporter = mailTransport();

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
  margin: 0; padding: 0; background: #F3F4F6;
`;

/* ─────────────────────────────────────────
   LUNCH START EMAIL  (1:30 PM reminder)
───────────────────────────────────────── */
export async function sendLunchStartEmail({ to, name }) {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyle}">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#F59E0B,#D97706);padding:28px 32px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">🍽️</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.3px">Lunch Time!</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px">01:30 PM — Break has started</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:15px;color:#374151">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6B7280;line-height:1.7">
              It's <strong style="color:#D97706">1:30 PM</strong> — your lunch break has started automatically.
              Please take a well-deserved break and return on time.
            </p>

            <!-- Info box -->
            <div style="background:#FFFBEB;border:1.5px solid #FCD34D;border-radius:12px;padding:16px 20px;margin-bottom:20px">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#92400E;font-weight:600">⏱ Allowed lunch duration</td>
                  <td align="right" style="font-size:15px;font-weight:800;color:#D97706">45 minutes</td>
                </tr>
                <tr><td colspan="2" style="padding-top:8px;font-size:12px;color:#B45309;line-height:1.6">
                  Exceeding 45 minutes may result in payroll deductions. Please return by <strong>2:15 PM</strong>.
                </td></tr>
              </table>
            </div>

            <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6">
              This is an automated reminder from Viralon HRMS. You do not need to reply to this email.
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
    from:    `"Viralon HR" <${MAIL_USER}>`,
    to,
    subject: "🍽️ Lunch Break Started — Back by 2:15 PM",
    html,
  });
}

/* ─────────────────────────────────────────
   LUNCH EXCEEDED EMAIL  (40+ min on break)
───────────────────────────────────────── */
export async function sendLunchOverEmail({ to, name, minutes }) {
  const mins        = Math.round(Number(minutes)) || 0;
  const exceeded    = Math.max(0, mins - 45);
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="${baseStyle}">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.09)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#EF4444,#DC2626);padding:28px 32px;text-align:center">
            <div style="font-size:40px;margin-bottom:8px">⏰</div>
            <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">Lunch Break Exceeded</h1>
            <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px">Please resume work immediately</p>
          </td>
        </tr>

        <!-- Alert bar -->
        <tr>
          <td style="background:#FEF2F2;border-bottom:1px solid #FECACA;padding:12px 32px">
            <p style="margin:0;font-size:13px;font-weight:700;color:#DC2626;text-align:center">
              ⚠️ You have been on break for <span style="font-size:16px">${mins} minutes</span> — ${exceeded > 0 ? exceeded + " min over limit" : "limit reached"}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 16px;font-size:15px;color:#374151">Hi <strong>${name}</strong>,</p>
            <p style="margin:0 0 20px;font-size:14px;color:#6B7280;line-height:1.7">
              Your lunch break has exceeded the allowed <strong style="color:#DC2626">45 minutes</strong>.
              Please end your lunch break and resume work as soon as possible to minimise any payroll impact.
            </p>

            <!-- Stats grid -->
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
                    <div style="font-size:20px;font-weight:800;color:#EF4444">${exceeded > 0 ? "+" + exceeded : "0"} min</div>
                    <div style="font-size:11px;color:#9CA3AF;margin-top:3px">Exceeded</div>
                  </div>
                </td>
              </tr>
            </table>

            ${exceeded > 0 ? `
            <div style="background:#FFF7ED;border:1.5px solid #FED7AA;border-radius:12px;padding:14px 18px;margin-bottom:20px">
              <p style="margin:0;font-size:13px;color:#92400E;line-height:1.6">
                💰 <strong>Deduction notice:</strong> A payroll deduction of
                <strong>₹${exceeded * 5}</strong> may apply for the ${exceeded} extra minutes
                (₹5 per minute policy).
              </p>
            </div>` : ""}

            <p style="margin:0;font-size:13px;color:#9CA3AF;line-height:1.6">
              Please end your lunch break from the attendance tracker. Contact HR if you believe this is an error.
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
    from:    `"Viralon HR" <${MAIL_USER}>`,
    to,
    subject: `⏰ Lunch Break Alert — ${mins} min (${exceeded > 0 ? exceeded + " min over" : "limit reached"})`,
    html,
  });
}
