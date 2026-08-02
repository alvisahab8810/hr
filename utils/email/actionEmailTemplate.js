// Shared email-safe (inline-CSS, table-based) HTML renderer for the
// "admin notification with Approve/Reject CTA" card used by Overtime,
// Leave and Reimbursement admin-notification emails.

const COLORS = {
  bg: "#EEF1F8",
  surface: "#FFFFFF",
  surface2: "#F8FAFC",
  ink: "#1F2333",
  inkMuted: "#6B7280",
  inkFaint: "#9AA1B8",
  border: "#E5E9F2",
  accent: "#4F46E5",
  accentWash: "#EEF0FF",
  approve: "#15803D",
  approveWash: "#DCFCE7",
  approveLine: "#BBF0CE",
  reject: "#DC2626",
  rejectWash: "#FEE2E2",
  rejectLine: "#F6C6C6",
  pending: "#B45309",
  pendingWash: "#FEF3C7",
  pendingLine: "#F3DFA1",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function renderInfoGrid(infoRows) {
  const rows = [];
  let i = 0;
  while (i < infoRows.length) {
    const row = infoRows[i];
    if (row.full) {
      rows.push(`
        <tr>
          <td colspan="2" style="padding:12px 16px;border-top:1px solid ${COLORS.border};">
            <div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.inkFaint};margin-bottom:4px;">${escapeHtml(row.label)}</div>
            <div style="font-size:13.5px;font-weight:500;color:${COLORS.inkMuted};">${escapeHtml(row.value)}</div>
          </td>
        </tr>`);
      i += 1;
    } else {
      const next = infoRows[i + 1] && !infoRows[i + 1].full ? infoRows[i + 1] : null;
      rows.push(`
        <tr>
          <td width="50%" style="padding:12px 16px;border-top:1px solid ${COLORS.border};border-right:1px solid ${COLORS.border};">
            <div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.inkFaint};margin-bottom:4px;">${escapeHtml(row.label)}</div>
            <div style="font-size:13.5px;font-weight:600;color:${COLORS.ink};">${escapeHtml(row.value)}</div>
          </td>
          <td width="50%" style="padding:12px 16px;border-top:1px solid ${COLORS.border};">
            ${next ? `<div style="font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLORS.inkFaint};margin-bottom:4px;">${escapeHtml(next.label)}</div>
            <div style="font-size:13.5px;font-weight:600;color:${COLORS.ink};">${escapeHtml(next.value)}</div>` : ""}
          </td>
        </tr>`);
      i += next ? 2 : 1;
    }
  }
  // first row shouldn't have a top border
  return rows.join("").replace("border-top:1px solid " + COLORS.border + ";", "border-top:none;");
}

export function renderActionEmailHtml({
  typeLabel, // "Overtime request" | "Leave application" | "Reimbursement"
  subjectEmoji = "🔔",
  headlineName,
  headlineSuffix,
  infoRows = [],
  approveUrl,
  rejectUrl,
  dashboardUrl,
}) {
  const hasActions = Boolean(approveUrl && rejectUrl);

  return `
  <div style="background:${COLORS.bg};padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:14px;overflow:hidden;">
      <tr>
        <td style="padding:20px 26px 4px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:34px;height:34px;border-radius:10px;background:${COLORS.accentWash};text-align:center;vertical-align:middle;font-size:15px;">${subjectEmoji}</td>
              <td style="padding-left:10px;font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:${COLORS.inkFaint};">${escapeHtml(typeLabel)}</td>
            </tr>
          </table>
          <p style="font-size:18.5px;font-weight:700;letter-spacing:-.01em;margin:14px 0 14px;color:${COLORS.ink};">
            ${escapeHtml(headlineName)} <span style="color:${COLORS.inkMuted};font-weight:500;">${escapeHtml(headlineSuffix)}</span>
          </p>
          <span style="display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;padding:5px 11px;border-radius:100px;color:${COLORS.pending};background:${COLORS.pendingWash};border:1px solid ${COLORS.pendingLine};margin-bottom:16px;">&#9679; Pending approval</span>
        </td>
      </tr>
      <tr>
        <td style="padding:6px 26px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${COLORS.border};border-radius:12px;background:${COLORS.surface2};overflow:hidden;">
            ${renderInfoGrid(infoRows)}
          </table>
        </td>
      </tr>
      ${hasActions ? `
      <tr>
        <td style="padding:22px 26px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="50%" style="padding-right:5px;">
                <a href="${approveUrl}" style="display:block;text-align:center;padding:13px 10px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;background:${COLORS.approve};color:#ffffff;">&#10003; Approve</a>
              </td>
              <td width="50%" style="padding-left:5px;">
                <a href="${rejectUrl}" style="display:block;text-align:center;padding:13px 10px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;background:transparent;color:${COLORS.reject};border:1.5px solid ${COLORS.rejectLine};">&#10005; Reject</a>
              </td>
            </tr>
          </table>
          <p style="font-size:11.5px;color:${COLORS.inkFaint};text-align:center;margin:12px 0 0;">Opens a secure confirmation page &mdash; no login needed.</p>
        </td>
      </tr>` : ""}
      ${dashboardUrl ? `
      <tr>
        <td style="padding:18px 26px 22px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.border};">
            <tr><td style="padding-top:16px;text-align:center;">
              <a href="${dashboardUrl}" style="color:${COLORS.accent};font-size:12.5px;font-weight:600;text-decoration:none;">Review all pending requests in the dashboard &rarr;</a>
            </td></tr>
          </table>
        </td>
      </tr>` : `<tr><td style="padding-bottom:14px;"></td></tr>`}
      <tr>
        <td style="padding:16px 26px;border-top:1px solid ${COLORS.border};background:${COLORS.surface2};font-size:11px;color:${COLORS.inkFaint};line-height:1.6;">
          Automated message from Viralon HRMS.${hasActions ? " This link is unique to this request and expires in 30 days or once actioned, whichever comes first." : ""}
        </td>
      </tr>
    </table>
  </div>`;
}
