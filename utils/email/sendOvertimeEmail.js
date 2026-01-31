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
}) {
  return transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to: MANAGEMENT_EMAILS,
    subject: "📢 New Overtime Request Submitted",
    html: `
      <h3>New Overtime Request</h3>

      <p>
        <b>Employee:</b> ${employeeName}<br/>
        <b>Email:</b> ${employeeEmail}
      </p>

      <p>
        <b>Project:</b> ${project}<br/>
        <b>Date:</b> ${new Date(date).toDateString()}<br/>
        <b>OT Type:</b> ${otType}<br/>
        <b>Time:</b> ${startTime} – ${endTime}
      </p>

      <p><b>Tasks:</b> ${tasks}</p>
      <p><b>Reason:</b> ${reason}</p>


        <p>
        <b>OT Access Given By:</b> ${otApprover}
      </p>

      
    

      <p>Status: <b>Pending Approval</b></p>

      <p>– Viralon HRMS</p>
    `,
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
