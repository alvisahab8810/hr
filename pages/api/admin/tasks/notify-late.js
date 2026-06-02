// POST /api/admin/tasks/notify-late
// Runs every 5 minutes via cron.
// Finds stages whose deadline just passed, sends ONE email per stage,
// then marks lateNotified=true so it never emails again for that stage.
import dbConnect   from "@/utils/dbConnect";
import Task        from "@/models/tasks/Task";
import Employee    from "@/models/hr/Employee";
import nodemailer  from "nodemailer";

const STAGE_NAMES = ["Script/Concept", "Shoot", "Design/Edit/Develop", "Posted/Live"];

async function sendLateEmail(empEmail, empName, task, stageName, deadline) {
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com", port: 587, secure: false,
    auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });

  const deadlineStr = new Date(deadline).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://payroll.viralon.in";

  await transporter.sendMail({
    from:    `"Viralon Team" <info@viralon.in>`,
    to:      empEmail,
    subject: `⏰ OVERDUE: ${task.nomenclature || task.title} — ${stageName} deadline missed`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#DC2626,#991B1B);padding:28px 32px;text-align:center">
        <div style="font-size:28px;margin-bottom:6px">⏰</div>
        <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:1px">TASK OVERDUE</div>
        <div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:4px">Action required immediately</div>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:28px 32px">
        <p style="margin:0 0 16px;font-size:15px;color:#374151">Hi <strong>${empName}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.65">
          Your stage submission was due and has <strong style="color:#DC2626">not been submitted yet</strong>.
          Please submit your work immediately.
        </p>

        <!-- Task card -->
        <div style="background:#FEF2F2;border:1.5px solid #FECACA;border-radius:10px;padding:18px 20px;margin-bottom:22px">
          <div style="font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Overdue Task</div>
          <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:12px">${task.nomenclature || task.title}</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#6B7280;width:40%">Stage</td>
              <td style="padding:5px 0;font-size:13px;font-weight:700;color:#DC2626">${stageName}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:#6B7280">Deadline was</td>
              <td style="padding:5px 0;font-size:13px;font-weight:700;color:#DC2626">${deadlineStr}</td>
            </tr>
            ${task.brandId?.name ? `<tr><td style="padding:5px 0;font-size:13px;color:#6B7280">Brand</td><td style="padding:5px 0;font-size:13px;font-weight:600;color:#0f172a">${task.brandId.name}</td></tr>` : ""}
          </table>
        </div>

        <!-- CTA -->
        <div style="text-align:center;margin-bottom:22px">
          <a href="${baseUrl}/employee/tasks" style="display:inline-block;padding:13px 36px;background:#DC2626;color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:15px;letter-spacing:.3px">
            Submit Now →
          </a>
        </div>

        <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6">
          If you need help or an extension, please contact your manager immediately.<br>
          — Viralon Team
        </p>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#0F0C29;padding:18px 32px;text-align:center">
        <div style="font-size:13px;font-weight:800;letter-spacing:2px;color:#fff">VIRALON</div>
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px">This is an automated overdue alert</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`,
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const cronSecret = req.headers["x-cron-secret"] || req.body?.cronSecret;
  const cookie     = req.headers.cookie || "";
  if (cronSecret !== process.env.CRON_SECRET && !cookie.includes("admin_auth=true")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();
  const now = new Date();

  try {
    // Find tasks where:
    // - Not completed
    // - Has at least one stage with deadline < now, not done, not yet notified
    const tasks = await Task.find({
      status:  { $nin: ["completed"] },
      "stages": {
        $elemMatch: {
          deadline:      { $lt: now },
          done:          false,
          lateNotified:  { $ne: true },
        },
      },
    })
    .populate("brandId", "name color")
    .lean();

    let notified = 0;
    const results = [];

    for (const task of tasks) {
      for (let i = 0; i < (task.stages || []).length; i++) {
        const stg = task.stages[i];

        // Skip: no deadline, not overdue, already done, already notified
        if (!stg.deadline)                        continue;
        if (new Date(stg.deadline) >= now)         continue;
        if (stg.done)                              continue;
        if (stg.lateNotified)                      continue;

        const empIds = Array.isArray(stg.assignedTo)
          ? stg.assignedTo
          : (stg.assignedTo ? [stg.assignedTo] : []);

        if (empIds.length === 0) {
          // No assignee — just mark notified so we don't keep checking
          await Task.updateOne(
            { _id: task._id },
            { $set: { [`stages.${i}.lateNotified`]: true } }
          );
          continue;
        }

        for (const empId of empIds) {
          const emp = await Employee.findById(empId)
            .select("firstName lastName personal professional email")
            .lean();
          if (!emp) continue;

          const empEmail = emp.professional?.officialEmail || emp.personal?.email || emp.email;
          const empName  = `${emp.personal?.firstName || emp.firstName || "Team Member"} ${emp.personal?.lastName || emp.lastName || ""}`.trim();

          if (!empEmail) continue;

          try {
            await sendLateEmail(empEmail, empName, task, STAGE_NAMES[i], stg.deadline);
            notified++;
            results.push({
              task:  task.nomenclature || task.title,
              stage: STAGE_NAMES[i],
              emp:   empName,
              email: empEmail,
            });
          } catch (emailErr) {
            console.error("[notify-late] Email failed:", emailErr.message);
          }
        }

        // Mark this stage as notified — won't email again even if cron re-runs
        await Task.updateOne(
          { _id: task._id },
          { $set: { [`stages.${i}.lateNotified`]: true } }
        );
      }
    }

    return res.json({ success: true, notified, results });
  } catch (err) {
    console.error("[notify-late]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
