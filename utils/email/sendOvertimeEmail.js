import nodemailer from "nodemailer";
import { renderActionEmailHtml } from "@/utils/email/actionEmailTemplate";

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 587,
  secure: false,
  auth: {
    user: "info@viralon.in",
    pass: process.env.EMAIL_PASS,
  },
});

const MANAGEMENT_EMAILS = [
  "hr@viralon.in",
  "ivan@viralon.in",
  "ishan@viralon.in",
  "riya@viralon.in",
];

/* ================= EMPLOYEE CONFIRMATION ================= */
export async function sendOvertimeAppliedEmployeeEmail({
  to,
  name,
  project,
  date,
  otType,
  startTime,
  endTime,
  reason,
  otApprover, // ✅ ADD

}) {
  return transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to,
    subject: "🕒 Overtime Request Submitted",
    html: `
      <p>Hi <b>${name}</b>,</p>

      <p>Your overtime request has been successfully submitted.</p>

      <p>
        <b>Project:</b> ${project}<br/>
        <b>Date:</b> ${new Date(date).toDateString()}<br/>
        <b>Type:</b> ${otType}<br/>
        <b>Time:</b> ${startTime} – ${endTime}
      </p>

      <p><b>Reason:</b> ${reason}</p>

     <p>
        <b>OT Access Given By:</b> ${otApprover}
      </p>


      <p>Status: <b>Pending Approval</b></p>

      <p>– Viralon HRMS</p>
    `,
  });
}

/* ================= MANAGEMENT ALERT ================= */
export async function sendOvertimeAppliedAdminEmail({
  employeeName,
  employeeEmail,
  project,
  date,
  otType,
  startTime,
  endTime,
  reason,
  tasks,
  otApprover, // 👈 ADD
  approveUrl,
  rejectUrl,
  dashboardUrl,
}) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const diffMins = (eh * 60 + em) - (sh * 60 + sm);
  const actualMins = diffMins === 0 ? 0 : diffMins > 0 ? diffMins : diffMins + 24 * 60;
  const duration = `${Math.floor(actualMins / 60)}h ${actualMins % 60}m`;

  const html = renderActionEmailHtml({
    typeLabel: "Overtime request",
    subjectEmoji: "🕒",
    headlineName: employeeName,
    headlineSuffix: "requested overtime approval",
    infoRows: [
      { label: "Employee", value: employeeName },
      { label: "Email", value: employeeEmail },
      { label: "Project", value: project },
      { label: "Date", value: new Date(date).toDateString() },
      { label: "Type", value: otType },
      { label: "Time", value: `${startTime} – ${endTime} (${duration})` },
      { label: "Tasks", value: tasks, full: true },
      { label: "Reason", value: reason, full: true },
      { label: "OT access given by", value: otApprover, full: true },
    ],
    approveUrl,
    rejectUrl,
    dashboardUrl,
  });

  return transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to: MANAGEMENT_EMAILS,
    subject: `🕒 New Overtime Request — ${employeeName}${project ? ` (${project})` : ""}`,
    html,
  });
}



/* ================= OT APPROVED ================= */
export async function sendOvertimeApprovedEmail({
  to,
  name,
  project,
  date,
  otType,
  startTime,
  endTime,
}) {
  return transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to,
    subject: "✅ Overtime Request Approved",
    html: `
      <p>Hi <b>${name}</b>,</p>

      <p>Your overtime request has been <b>approved</b>.</p>

      <p>
        <b>Project:</b> ${project}<br/>
        <b>Date:</b> ${new Date(date).toDateString()}<br/>
        <b>Type:</b> ${otType}<br/>
        <b>Time:</b> ${startTime} – ${endTime}
      </p>

      <p>This will be considered in payroll.</p>

      <p>– Viralon HRMS</p>
    `,
  });
}

/* ================= OT REJECTED ================= */
export async function sendOvertimeRejectedEmail({
  to,
  name,
  project,
  date,
  otType,
  remark,
}) {
  return transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to,
    subject: "❌ Overtime Request Rejected",
    html: `
      <p>Hi <b>${name}</b>,</p>

      <p>Your overtime request has been <b>rejected</b>.</p>

      <p>
        <b>Project:</b> ${project}<br/>
        <b>Date:</b> ${new Date(date).toDateString()}<br/>
        <b>Type:</b> ${otType}
      </p>

      <p><b>Reason:</b> ${remark}</p>

      <p>– Viralon HRMS</p>
    `,
  });
}
