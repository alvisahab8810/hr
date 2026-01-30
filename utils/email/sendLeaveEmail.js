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

/* -------- EMPLOYEE APPLIED -------- */
export async function sendLeaveAppliedEmail({
  employeeEmail,
  employeeName,
  leaveType,
  startDate,
  endDate,
  totalDays,
  reason,
}) {
  // 📩 Employee confirmation
  await transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to: employeeEmail,
    subject: "Leave Application Submitted",
    html: `
      <p>Hi <b>${employeeName}</b>,</p>

      <p>Your <b>${leaveType}</b> has been submitted successfully.</p>

      <p>
        <b>Dates:</b> ${startDate} to ${endDate}<br/>
        <b>Total Days:</b> ${totalDays}<br/>
        <b>Reason:</b> ${reason}
      </p>

      <p>Status: <b>Pending Approval</b></p>

      <br/>
      <p>– Viralon HRMS</p>
    `,
  });

  // 📩 HR notification
  await transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to: [
      "hr@viralon.in",
      "ivan@viralon.in",
      "ishan@viralon.in",
      "riya@viralon.in",
    ],
    subject: "New Leave Application Received",
    html: `
      <p>A new leave application has been submitted.</p>

      <p>
        <b>Employee:</b> ${employeeName}<br/>
        <b>Leave Type:</b> ${leaveType}<br/>
        <b>Dates:</b> ${startDate} to ${endDate}<br/>
        <b>Total Days:</b> ${totalDays}<br/>
        <b>Reason:</b> ${reason}
      </p>

      <p>Please review it in the Admin Panel.</p>

      <br/>
      <p>– Viralon HRMS</p>
    `,
  });
}
