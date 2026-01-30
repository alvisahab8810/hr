import nodemailer from "nodemailer";

export async function sendLunchReminderEmail({ to, name, minutes }) {
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 587,
    secure: false,
    auth: {
      user: "info@viralon.in",
      pass: process.env.EMAIL_PASS,
    },
  });

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; line-height:1.6">
      <h2>🍴 Lunch Break Reminder</h2>
      <p>Hi <b>${name}</b>,</p>

      <p>
        Your lunch break has exceeded the allowed
        <b>45 minutes</b>.
      </p>

      <p>
        ⏱ Current break duration:
        <b>${minutes} minutes</b>
      </p>

      <p>
        Please resume work immediately to avoid payroll deductions.
      </p>

      <br />
      <p style="color:#777">
        – Viralon HRMS<br/>
        (This is an automated reminder)
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to,
    subject: "Lunch Break Exceeded ⏰",
    html: htmlBody,
  });
}
