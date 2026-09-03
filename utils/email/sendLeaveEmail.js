import { mailTransport, MAIL_FROM, MAIL_USER } from "@/utils/mailer";
import { renderActionEmailHtml } from "@/utils/email/actionEmailTemplate";

const transporter = mailTransport();

/* -------- EMPLOYEE APPLIED -------- */
export async function sendLeaveAppliedEmail({
  employeeEmail,
  employeeName,
  leaveType,
  startDate,
  endDate,
  totalDays,
  reason,
  approveUrl,
  rejectUrl,
  dashboardUrl,
}) {
  // 📩 Employee confirmation
  await transporter.sendMail({
    from: `"Viralon HR" <${MAIL_USER}>`,
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
  const html = renderActionEmailHtml({
    typeLabel: "Leave application",
    subjectEmoji: "📅",
    headlineName: employeeName,
    headlineSuffix: "applied for leave",
    infoRows: [
      { label: "Employee", value: employeeName },
      { label: "Leave Type", value: leaveType },
      { label: "Dates", value: `${startDate} to ${endDate}` },
      { label: "Total Days", value: totalDays },
      { label: "Reason", value: reason, full: true },
    ],
    approveUrl,
    rejectUrl,
    dashboardUrl,
  });

  await transporter.sendMail({
    from: `"Viralon HR" <${MAIL_USER}>`,
    to: [
      "hr@viralon.in",
      "ivan@viralon.in",
      "ishan@viralon.in",
      "riya@viralon.in",
    ],
    subject: `📅 New Leave Application — ${employeeName}`,
    html,
  });
}
