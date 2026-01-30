import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: {
    user: "info@viralon.in",
    pass: process.env.EMAIL_PASS,
  },
});

/* -------- LUNCH START -------- */
export async function sendLunchStartEmail({ to, name }) {
  await transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to,
    subject: "🍴 Lunch Time Reminder",
    html: `
      <p>Hi <b>${name}</b>,</p>
      <p>It’s <b>1:30 PM</b>. Please start your lunch break.</p>
      <p>– Viralon HRMS</p>
    `,
  });
}

/* -------- OVER LUNCH -------- */
export async function sendLunchOverEmail({ to, name, minutes }) {
  await transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to,
    subject: "⏰ Lunch Break Exceeded",
    html: `
      <p>Hi <b>${name}</b>,</p>
      <p>Your lunch break has exceeded <b>45 minutes</b>.</p>
      <p>Current duration: <b>${minutes} minutes</b></p>
      <p>Payroll deduction may apply.</p>
      <p>– Viralon HRMS</p>
    `,
  });
}
