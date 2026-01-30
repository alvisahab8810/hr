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

/* ================= EMPLOYEE SUBMIT ================= */

export async function sendReimbursementSubmittedEmail({
  employeeEmail,
  employeeName,
  category,
  amount,
  paymentDate,
  description,
}) {
  const adminEmails = [
    "hr@viralon.in",
    "ivan@viralon.in",
    "ishan@viralon.in",
    "riya@viralon.in",
  ];

  /* ---- Employee confirmation ---- */
  await transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to: employeeEmail,
    subject: "📄 Reimbursement Request Submitted",
    html: `
      <p>Hi <b>${employeeName}</b>,</p>
      <p>Your reimbursement request has been submitted successfully.</p>

      <p><b>Category:</b> ${category}</p>
      <p><b>Amount:</b> ₹${amount}</p>
      <p><b>Payment Date:</b> ${new Date(paymentDate).toDateString()}</p>
      <p><b>Description:</b> ${description}</p>

      <br/>
      <p>Our finance team will review your request.</p>
      <p>– Viralon HRMS</p>
    `,
  });

  /* ---- Admin notification ---- */
  await transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to: adminEmails.join(","),
    subject: "🧾 New Reimbursement Request Submitted",
    html: `
      <p>A new reimbursement request has been submitted.</p>

      <p><b>Employee:</b> ${employeeName}</p>
      <p><b>Category:</b> ${category}</p>
      <p><b>Amount:</b> ₹${amount}</p>
      <p><b>Date:</b> ${new Date(paymentDate).toDateString()}</p>

      <p>Please review it in the admin panel.</p>
      <p>– Viralon HRMS</p>
    `,
  });
}




/* ================= ADMIN APPROVED ================= */

export function sendReimbursementApprovedEmail({
  employeeEmail,
  employeeName,
  category,
  amount,
}) {
  transporter
    .sendMail({
      from: `"Viralon HR" <info@viralon.in>`,
      to: employeeEmail,
      subject: "✅ Reimbursement Approved",
      html: `
        <p>Hi <b>${employeeName}</b>,</p>

        <p>Your reimbursement request has been <b>approved</b>.</p>

        <p><b>Category:</b> ${category}</p>
        <p><b>Amount:</b> ₹${amount}</p>

        <br/>
        <p>The amount will be processed as per payroll cycle.</p>

        <p style="color:#777">– Viralon HRMS</p>
      `,
    })
    .catch((err) =>
      console.error("Reimbursement approved email failed:", err)
    );
}

/* ================= ADMIN REJECTED ================= */

export function sendReimbursementRejectedEmail({
  employeeEmail,
  employeeName,
  category,
  amount,
  remark,
}) {
  transporter
    .sendMail({
      from: `"Viralon HR" <info@viralon.in>`,
      to: employeeEmail,
      subject: "❌ Reimbursement Rejected",
      html: `
        <p>Hi <b>${employeeName}</b>,</p>

        <p>Your reimbursement request has been <b>rejected</b>.</p>

        <p><b>Category:</b> ${category}</p>
        <p><b>Amount:</b> ₹${amount}</p>

        <p><b>Remark:</b></p>
        <p style="background:#f5f5f5;padding:10px;border-left:3px solid red">
          ${remark || "No remark provided"}
        </p>

        <br/>
        <p>Please contact HR if you need clarification.</p>

        <p style="color:#777">– Viralon HRMS</p>
      `,
    })
    .catch((err) =>
      console.error("Reimbursement rejected email failed:", err)
    );
}
