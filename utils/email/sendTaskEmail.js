import { mailTransport, MAIL_FROM, MAIL_USER } from "@/utils/mailer";

const transporter = mailTransport();

/* ── Helpers ─────────────────────────────────────────────────── */
function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// Full deadline: "Monday, 2 June 2026 at 05:30 PM"
function fmtDeadline(d) {
  if (!d) return null;
  const dt = new Date(d);
  const day  = dt.toLocaleDateString("en-IN", { weekday: "long" });
  const date = dt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const time = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  return `${day}, ${date} at ${time}`;
}

const STAGE_COLORS = ["#F59E0B", "#6366F1", "#10B981", "#EC4899"];
const STAGE_NAMES  = ["Script/Concept", "Shoot/Design", "Edit/Develop", "Posted/Live"];

function priorityBadge(priority) {
  const map = {
    urgent: { bg: "#FEE2E2", color: "#DC2626", label: "🔴 Urgent" },
    high:   { bg: "#FFF7ED", color: "#EA580C", label: "🟠 High"   },
    medium: { bg: "#EEF2FF", color: "#4F46E5", label: "🔵 Medium"  },
    low:    { bg: "#DCFCE7", color: "#15803D", label: "🟢 Low"     },
  };
  const m = map[priority] || map.medium;
  return `<span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${m.bg};color:${m.color};">${m.label}</span>`;
}

function taskTypeBadge(taskType) {
  const map = {
    production: { label: "Production",   color: "#8B5CF6" },
    project:    { label: "Project Task", color: "#0EA5E9" },
    sprint:     { label: "Sprint Task",  color: "#F97316" },
    manual:     { label: "Task",         color: "#6B7280" },
  };
  const m = map[taskType] || map.manual;
  return `<span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:${m.color}18;color:${m.color};">${m.label}</span>`;
}

/* ── Header shared block ─────────────────────────────────────── */
function emailHeader(title, subtitle) {
  return `
  <tr>
    <td style="background:linear-gradient(135deg,#1e1b4b 0%,#4F46E5 60%,#7C3AED 100%);padding:36px 48px 32px;text-align:left;position:relative;">
      <div style="font-size:13px;letter-spacing:3px;font-weight:700;color:rgba(255,255,255,0.5);text-transform:uppercase;margin-bottom:8px;">Viralon</div>
      <div style="font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;margin-bottom:8px;">${title}</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.65);font-weight:400;">${subtitle}</div>
    </td>
  </tr>`;
}

/* ── Footer shared block ─────────────────────────────────────── */
function emailFooter() {
  return `
  <tr>
    <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 48px;text-align:center;">
      <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">This is an automated notification from Viralon.</p>
      <p style="margin:0;font-size:12px;color:#cbd5e1;">
        <a href="https://viralon.in" style="color:#5A57FB;text-decoration:none;font-weight:600;">viralon.in</a>
        &nbsp;·&nbsp; info@viralon.in
      </p>
    </td>
  </tr>`;
}

/* ── Row helper ──────────────────────────────────────────────── */
function infoRow(label, value) {
  if (!value) return "";
  return `
  <tr>
    <td style="padding:8px 0;vertical-align:top;width:130px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px;">${label}</td>
    <td style="padding:8px 0;vertical-align:top;font-size:14px;color:#0f172a;font-weight:500;">${value}</td>
  </tr>`;
}

/* ═══════════════════════════════════════════════════════════════
   1. Task Assigned — sent to assigned employee
   ═══════════════════════════════════════════════════════════════ */
export async function sendTaskAssignedEmail({ employeeEmail, employeeName, task, assignerName, brandName, clientName, stageName, stageDeadline }) {
  if (!employeeEmail) return;

  const due = fmtDeadline(stageDeadline || task.dueDate || task.scheduledFor);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">

        ${emailHeader("New Task Assigned", `Hi ${employeeName} — you have a new task waiting for you.`)}

        <!-- Body -->
        <tr>
          <td style="padding:36px 48px;">

            <!-- Task title block -->
            <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">TASK</div>
              <div style="font-size:20px;font-weight:800;color:#0f172a;line-height:1.3;margin-bottom:12px;">${task.nomenclature || task.title}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${taskTypeBadge(task.taskType)}
                &nbsp;
                ${priorityBadge(task.priority)}
              </div>
            </div>

            <!-- Details table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${infoRow("Assigned by", assignerName || "Admin Team")}
              ${brandName  ? infoRow("Brand / Client", `${brandName}${clientName ? ` (${clientName})` : ""}`) : ""}
              ${stageName  ? infoRow("Stage", `<strong>${stageName}</strong>`) : ""}
              ${due        ? infoRow("Deadline", `<strong style="color:#DC2626;">${due}</strong>`) : ""}
              ${task.description ? infoRow("Description", `<span style="color:#475569;line-height:1.7;">${task.description.slice(0, 300)}${task.description.length > 300 ? "…" : ""}</span>`) : ""}
            </table>

            <!-- What to do next -->
            <div style="background:#EEF2FF;border-left:4px solid #5A57FB;border-radius:0 10px 10px 0;padding:16px 20px;margin-top:28px;">
              <div style="font-size:13px;font-weight:700;color:#3730A3;margin-bottom:4px;">What to do next</div>
              <div style="font-size:13px;color:#4F46E5;line-height:1.6;">
                Log in to your portal, pick up this task, and move it through the stages. Keep the status updated so the team stays aligned.
              </div>
            </div>

          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 48px 36px;text-align:left;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in"}/employee/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#5A57FB,#4845d4);color:#ffffff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;letter-spacing:0.2px;">
              Open Portal &rarr;
            </a>
          </td>
        </tr>

        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Viralon Team" <${MAIL_USER}>`,
    to:      employeeEmail,
    subject: `📋 New Task: ${task.nomenclature || task.title}`,
    html,
  });
}

/* ═══════════════════════════════════════════════════════════════
   2. Client Task Request — sent to anurag@viralon.in
   ═══════════════════════════════════════════════════════════════ */
export async function sendClientRequestEmail({ clientName, clientEmail, brandName, title, description, service, priority, referenceLinks }) {
  const SERVICE_LABELS = {
    socialMedia: "Social Media Marketing",
    website:     "Web Development",
    seo:         "SEO",
    ads:         "Ad Campaigns",
    branding:    "Branding",
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">

        ${emailHeader("New Client Request", "A client has submitted a new task request via the client portal.")}

        <!-- Alert strip -->
        <tr>
          <td style="background:#DCFCE7;border-bottom:1px solid #BBF7D0;padding:12px 48px;">
            <span style="font-size:13px;font-weight:700;color:#15803D;">⚡ Action needed — review and scope this request in the admin panel</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 48px;">

            <!-- Client + Brand block -->
            <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:12px;padding:20px 24px;margin-bottom:28px;display:flex;gap:16px;align-items:flex-start;">
              <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#5A57FB,#7C3AED);display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:800;color:#fff;flex-shrink:0;">
                ${(clientName || "C")[0].toUpperCase()}
              </div>
              <div>
                <div style="font-size:16px;font-weight:800;color:#0f172a;">${clientName}</div>
                <div style="font-size:13px;color:#64748b;margin-top:2px;">${clientEmail}</div>
                <div style="margin-top:6px;display:inline-block;padding:2px 10px;background:#EEF2FF;color:#4F46E5;border-radius:20px;font-size:11px;font-weight:700;">${brandName}</div>
              </div>
            </div>

            <!-- Request details -->
            <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">Request Details</div>

            <!-- Task title -->
            <div style="font-size:20px;font-weight:800;color:#0f172a;margin-bottom:16px;line-height:1.3;">${title}</div>

            <!-- Meta badges -->
            <div style="margin-bottom:20px;">
              ${priorityBadge(priority)}
              &nbsp;
              <span style="display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;background:#F0F9FF;color:#0EA5E9;">
                ${SERVICE_LABELS[service] || service || "General"}
              </span>
            </div>

            <!-- Description -->
            ${description ? `
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;margin-bottom:20px;">
              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;">Client Brief</div>
              <div style="font-size:14px;color:#374151;line-height:1.75;white-space:pre-wrap;">${description}</div>
            </div>` : ""}

            <!-- Reference links -->
            ${(referenceLinks || []).filter(Boolean).length > 0 ? `
            <div style="margin-bottom:20px;">
              <div style="font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px;">Reference Links</div>
              ${(referenceLinks || []).filter(Boolean).map(l => `
              <div style="margin-bottom:4px;">
                <a href="${l}" style="color:#5A57FB;font-size:13px;font-weight:600;text-decoration:none;">🔗 ${l}</a>
              </div>`).join("")}
            </div>` : ""}

            <!-- Divider -->
            <div style="border-top:1px solid #F1F5F9;margin:24px 0;"></div>

            <!-- Timestamp -->
            <div style="font-size:12px;color:#94a3b8;">
              Received on <strong>${new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</strong>
              at <strong>${new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</strong>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:0 48px 36px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in"}/dashboard/admin/task-requests" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#5A57FB,#4845d4);color:#ffffff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;">
              Review in Admin Panel
            </a>
          </td>
        </tr>

        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Viralon Client Portal" <${MAIL_USER}>`,
    to:      "anurag@viralon.in",
    cc:      "info@viralon.in",
    subject: `🆕 Task Request — ${brandName}: ${title}`,
    html,
  });
}

/* ═══════════════════════════════════════════════════════════════
   3. Stage Approved — sent to assigned employee(s)
   ═══════════════════════════════════════════════════════════════ */
export async function sendStageApprovedEmail({ employeeEmail, employeeName, task, stageName, stageIndex, stageDeadline, grade }) {
  if (!employeeEmail) return;

  const stageColor = STAGE_COLORS[stageIndex] ?? "#6366F1";
  const deadline   = fmtDeadline(stageDeadline);

  const lateMin = grade ? Math.round(grade.hoursLate * 60) : 0;
  const lateStr = lateMin < 60 ? `${lateMin} min late` : `${grade.hoursLate.toFixed(1)}h late`;

  const gradeBlock = grade ? `
    <div style="display:inline-flex;align-items:center;gap:12px;background:${grade.bg};border:1.5px solid ${grade.color}30;border-radius:12px;padding:12px 20px;margin-top:16px;">
      <span style="font-size:28px;font-weight:900;color:${grade.color};">${grade.label}</span>
      <div>
        <div style="font-size:12px;font-weight:700;color:${grade.color};text-transform:uppercase;letter-spacing:.5px;">Stage Grade</div>
        <div style="font-size:12px;color:${grade.color};opacity:0.75;">${grade.hoursLate <= 0 ? "✅ Submitted on time" : `⏱ ${lateStr}`}</div>
      </div>
    </div>` : "";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">

        ${emailHeader("Stage Approved ✅", `Hi ${employeeName} — your stage has been reviewed and approved!`)}

        <!-- Green confirmation strip -->
        <tr>
          <td style="background:#DCFCE7;border-bottom:1px solid #BBF7D0;padding:12px 48px;">
            <span style="font-size:13px;font-weight:700;color:#15803D;">🎉 Great work! Your submission was approved by the admin.</span>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 48px;">

            <!-- Stage badge -->
            <div style="display:inline-flex;align-items:center;gap:10px;background:${stageColor}15;border:1.5px solid ${stageColor}40;border-radius:10px;padding:10px 16px;margin-bottom:24px;">
              <div style="width:28px;height:28px;border-radius:8px;background:${stageColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;">S${stageIndex + 1}</div>
              <span style="font-size:14px;font-weight:700;color:${stageColor};">${stageName}</span>
            </div>

            <!-- Task block -->
            <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-left:4px solid ${stageColor};border-radius:12px;padding:18px 22px;margin-bottom:24px;">
              <div style="font-size:10.5px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Task</div>
              <div style="font-size:18px;font-weight:800;color:#0f172a;">${task.nomenclature || task.title}</div>
              ${task.brandId?.name ? `<div style="margin-top:4px;font-size:12px;color:#6366F1;font-weight:600;">${task.brandId.name}</div>` : ""}
            </div>

            <!-- Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${deadline ? infoRow("Deadline", `<strong style="color:#64748B;">${deadline}</strong>`) : ""}
            </table>

            <!-- Grade -->
            ${gradeBlock}

            <!-- Next step note -->
            <div style="background:#EEF2FF;border-left:4px solid #5A57FB;border-radius:0 10px 10px 0;padding:16px 20px;margin-top:24px;">
              <div style="font-size:13px;font-weight:700;color:#3730A3;margin-bottom:4px;">What's next?</div>
              <div style="font-size:13px;color:#4F46E5;line-height:1.6;">The next stage team has been notified. Check the portal for any further updates on this task.</div>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:0 48px 36px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in"}/employee/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#5A57FB,#4845d4);color:#ffffff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;">
              Open Portal &rarr;
            </a>
          </td>
        </tr>

        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Viralon Team" <${MAIL_USER}>`,
    to:      employeeEmail,
    subject: `✅ Stage Approved — ${stageName} · ${task.nomenclature || task.title}`,
    html,
  });
}

/* ═══════════════════════════════════════════════════════════════
   4. Stage Rejected — sent to assigned employee(s)
   ═══════════════════════════════════════════════════════════════ */
export async function sendStageRejectedEmail({ employeeEmail, employeeName, task, stageName, stageIndex, stageDeadline, rejectReason }) {
  if (!employeeEmail) return;

  const stageColor = STAGE_COLORS[stageIndex] ?? "#6366F1";
  const deadline   = fmtDeadline(stageDeadline);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.10);">

        ${emailHeader("Stage Needs Revision ❌", `Hi ${employeeName} — your stage submission needs changes.`)}

        <!-- Red strip -->
        <tr>
          <td style="background:#FEE2E2;border-bottom:1px solid #FCA5A5;padding:12px 48px;">
            <span style="font-size:13px;font-weight:700;color:#DC2626;">⚠️ Please review the feedback below and resubmit.</span>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 48px;">

            <!-- Stage badge -->
            <div style="display:inline-flex;align-items:center;gap:10px;background:${stageColor}15;border:1.5px solid ${stageColor}40;border-radius:10px;padding:10px 16px;margin-bottom:24px;">
              <div style="width:28px;height:28px;border-radius:8px;background:${stageColor};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;">S${stageIndex + 1}</div>
              <span style="font-size:14px;font-weight:700;color:${stageColor};">${stageName}</span>
            </div>

            <!-- Task block -->
            <div style="background:#F8FAFC;border:1.5px solid #E2E8F0;border-left:4px solid ${stageColor};border-radius:12px;padding:18px 22px;margin-bottom:24px;">
              <div style="font-size:10.5px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px;">Task</div>
              <div style="font-size:18px;font-weight:800;color:#0f172a;">${task.nomenclature || task.title}</div>
              ${task.brandId?.name ? `<div style="margin-top:4px;font-size:12px;color:#6366F1;font-weight:600;">${task.brandId.name}</div>` : ""}
            </div>

            <!-- Rejection reason -->
            ${rejectReason ? `
            <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
              <div style="font-size:10.5px;font-weight:700;color:#DC2626;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">Admin Feedback</div>
              <div style="font-size:14px;color:#7F1D1D;line-height:1.7;white-space:pre-wrap;">${rejectReason}</div>
            </div>` : ""}

            <!-- Details -->
            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              ${deadline ? infoRow("Deadline", `<strong style="color:#DC2626;">${deadline}</strong>`) : ""}
            </table>

            <!-- What to do -->
            <div style="background:#FFF7ED;border-left:4px solid #F97316;border-radius:0 10px 10px 0;padding:16px 20px;margin-top:24px;">
              <div style="font-size:13px;font-weight:700;color:#C2410C;margin-bottom:4px;">Action Required</div>
              <div style="font-size:13px;color:#EA580C;line-height:1.6;">Please make the necessary changes and resubmit before the deadline. Open the portal to update your work and mark the stage as done again.</div>
            </div>
          </td>
        </tr>

        <tr>
          <td style="padding:0 48px 36px;">
            <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in"}/employee/dashboard" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#DC2626,#B91C1C);color:#ffffff;font-size:14px;font-weight:700;border-radius:10px;text-decoration:none;">
              Open Portal &rarr;
            </a>
          </td>
        </tr>

        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Viralon Team" <${MAIL_USER}>`,
    to:      employeeEmail,
    subject: `❌ Stage Rejected — ${stageName} · ${task.nomenclature || task.title}`,
    html,
  });
}

/* ═══════════════════════════════════════════════════════════════
   5. Task Offer / Announcement Created — sent to all managers
   ═══════════════════════════════════════════════════════════════ */
export async function sendOfferCreatedEmail({ offerTitle, offerDescription, offerTag, adminName }) {
  // Internal notification — no need for external email, kept for future use
}
