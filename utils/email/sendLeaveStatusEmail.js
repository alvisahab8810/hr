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

/* -------- APPROVED -------- */
export async function sendLeaveApprovedEmail({
  to,
  name,
  leaveType,
  startDate,
  endDate,
  totalDays,
  remark,
}) {
  return transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to,
    subject: "✅ Leave Approved",
    html: `
      <p>Hi <b>${name}</b>,</p>

      <p>Your leave request has been <b style="color:green">approved</b>.</p>

      <p>
        <b>Type:</b> ${leaveType}<br/>
        <b>Duration:</b> ${new Date(startDate).toDateString()} –
        ${new Date(endDate).toDateString()}<br/>
        <b>Total Days:</b> ${totalDays}
      </p>

      ${
        remark
          ? `<p><b>Admin Remark:</b> ${remark}</p>`
          : ""
      }

      <p>– Viralon HRMS</p>
    `,
  });
}

/* -------- REJECTED -------- */
export async function sendLeaveRejectedEmail({
  to,
  name,
  leaveType,
  startDate,
  endDate,
  remark,
}) {
  return transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to,
    subject: "❌ Leave Rejected",
    html: `
      <p>Hi <b>${name}</b>,</p>

      <p>Your leave request has been <b style="color:red">rejected</b>.</p>

      <p>
        <b>Type:</b> ${leaveType}<br/>
        <b>Duration:</b> ${new Date(startDate).toDateString()} –
        ${new Date(endDate).toDateString()}
      </p>

      ${
        remark
          ? `<p><b>Admin Remark:</b> ${remark}</p>`
          : ""
      }

      <p>– Viralon HRMS</p>
    `,
  });
}
