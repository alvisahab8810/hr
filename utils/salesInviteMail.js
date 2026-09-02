// utils/salesInviteMail.js — the onboarding mail a new salesperson gets.
// Same Hostinger mailbox the lead mails go out from.
import nodemailer from "nodemailer";

const send = ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
  });
  return transporter.sendMail({ from: '"Viralon" <info@viralon.in>', to, subject, html });
};

export function sendSalesInvite({ to, name, username, password, loginUrl, menus }) {
  const list = (menus || []).map((m) => `<li style="margin:2px 0">${m}</li>`).join("") || "<li>Leads</li>";
  const html = `
  <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#F6F6FB;padding:26px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #ECECF6;overflow:hidden">
      <div style="background:linear-gradient(135deg,#6366F1,#4338CA);padding:20px 24px;color:#fff">
        <div style="font-size:18px;font-weight:800">Welcome to the Viralon Sales CRM</div>
        <div style="font-size:12.5px;opacity:.9;margin-top:3px">Your account is ready, ${name}.</div>
      </div>
      <div style="padding:22px 24px;color:#334155;font-size:13.5px;line-height:1.6">
        <p style="margin:0 0 14px">Sign in with the details below and start working your leads.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13.5px;margin-bottom:16px">
          <tr><td style="padding:7px 0;color:#64748B">Username</td><td style="padding:7px 0;font-weight:700">${username}</td></tr>
          <tr><td style="padding:7px 0;color:#64748B">Password</td><td style="padding:7px 0;font-weight:700">${password}</td></tr>
        </table>
        <a href="${loginUrl}" style="display:inline-block;background:#6366F1;color:#fff;text-decoration:none;font-weight:700;padding:11px 20px;border-radius:11px;font-size:13.5px">Open the login page</a>
        <p style="margin:18px 0 6px;font-weight:700;color:#0F172A">What you can open</p>
        <ul style="margin:0;padding-left:18px;color:#475569">${list}</ul>
        <p style="margin:18px 0 0;font-size:12px;color:#94A3B8">Keep this mail safe. Ask the admin if you need your password changed.</p>
      </div>
    </div>
  </div>`;
  return send({ to, subject: "Your Viralon Sales CRM login", html });
}
