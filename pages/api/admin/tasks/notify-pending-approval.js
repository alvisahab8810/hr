// POST /api/admin/tasks/notify-pending-approval
// Runs once a day via cron.
// Finds tasks stuck at status "review" (i.e. content awaiting the client's
// approve/reject decision) and, for every client who hasn't been reminded
// today, sends ONE digest email listing everything still pending. Keeps
// re-sending every day (via lastApprovalReminderAt) until the client
// actually approves or gives feedback — at which point status leaves
// "review" and the task stops showing up here.
import dbConnect  from "@/utils/dbConnect";
import Task       from "@/models/tasks/Task";
import Brand      from "@/models/tasks/Brand";
import Client      from "@/models/clients/Client";
import nodemailer from "nodemailer";

const CONTENT_LABEL = { reel: "Reel", post: "Post", carousel: "Carousel", story: "Story" };

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function sendReminderEmail(client, items) {
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com", port: 587, secure: false,
    auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false },
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in";
  const rows = items.map(t => `
    <tr>
      <td style="padding:10px 14px;font-size:13px;color:#0f172a;font-weight:600;border-bottom:1px solid #F1F5F9">${t.nomenclature || t.title}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #F1F5F9">${t.brandName || "-"}</td>
      <td style="padding:10px 14px;font-size:12px;color:#6B7280;border-bottom:1px solid #F1F5F9">${CONTENT_LABEL[t.contentType] || t.contentType || "-"}</td>
    </tr>`).join("");

  const portalUrl = items[0]?.brandSlug ? `${baseUrl}/${items[0].brandSlug}/login` : baseUrl;

  await transporter.sendMail({
    from:    `"Viralon Team" <info@viralon.in>`,
    to:      client.email,
    subject: `Reminder: ${items.length} item${items.length > 1 ? "s" : ""} awaiting your approval`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb">

      <tr><td style="background:linear-gradient(135deg,#4F46E5,#4338CA);padding:28px 32px;text-align:center">
        <div style="font-size:28px;margin-bottom:6px">🔔</div>
        <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:.5px">Approval Pending</div>
        <div style="font-size:12px;color:rgba(255,255,255,.75);margin-top:4px">Content is waiting for your review</div>
      </td></tr>

      <tr><td style="padding:28px 32px">
        <p style="margin:0 0 16px;font-size:15px;color:#374151">Hi <strong>${client.name}</strong>,</p>
        <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.65">
          You still have <strong>${items.length}</strong> item${items.length > 1 ? "s" : ""} ready for your review in your client portal.
          Please take a moment to approve or send feedback so we can keep things moving.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E5E7EB;border-radius:10px;overflow:hidden;margin-bottom:22px">
          <tr style="background:#F8FAFC">
            <td style="padding:9px 14px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.5px">Content</td>
            <td style="padding:9px 14px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.5px">Brand</td>
            <td style="padding:9px 14px;font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.5px">Type</td>
          </tr>
          ${rows}
        </table>

        <div style="text-align:center;margin-bottom:22px">
          <a href="${portalUrl}" style="display:inline-block;padding:13px 36px;background:#4F46E5;color:#fff;text-decoration:none;border-radius:9px;font-weight:700;font-size:15px;letter-spacing:.3px">
            Review & Approve →
          </a>
        </div>

        <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.6">
          You'll keep receiving this reminder once a day until it's approved or you send feedback.<br>
          — Viralon Team
        </p>
      </td></tr>

      <tr><td style="background:#0F0C29;padding:18px 32px;text-align:center">
        <div style="font-size:13px;font-weight:800;letter-spacing:2px;color:#fff">VIRALON</div>
        <div style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px">This is an automated reminder</div>
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
  const cookie      = req.headers.cookie || "";
  if (cronSecret !== process.env.CRON_SECRET && !cookie.includes("admin_auth=true")) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();
  const today = startOfToday();

  try {
    const tasks = await Task.find({
      status: "review",
      $or: [
        { lastApprovalReminderAt: null },
        { lastApprovalReminderAt: { $lt: today } },
      ],
    })
      .populate("brandId", "name slug clientId")
      .lean();

    // Group by client — one email per client per day, listing everything pending
    const byClient = new Map();
    for (const task of tasks) {
      const brand = task.brandId;
      if (!brand || !brand.clientId) continue; // no client linked, can't email
      const key = brand.clientId.toString();
      if (!byClient.has(key)) byClient.set(key, []);
      byClient.get(key).push({
        _id: task._id,
        title: task.title,
        nomenclature: task.nomenclature,
        contentType: task.contentType,
        brandName: brand.name,
        brandSlug: brand.slug,
      });
    }

    let notified = 0;
    const results = [];

    for (const [clientId, items] of byClient) {
      const client = await Client.findById(clientId).select("name email status").lean();
      if (!client || client.status !== "Active" || !client.email) continue;

      try {
        await sendReminderEmail(client, items);
        notified++;
        results.push({ client: client.name, email: client.email, count: items.length });

        await Task.updateMany(
          { _id: { $in: items.map(i => i._id) } },
          { $set: { lastApprovalReminderAt: new Date() } }
        );
      } catch (emailErr) {
        console.error("[notify-pending-approval] Email failed:", emailErr.message);
      }
    }

    return res.json({ success: true, notified, results });
  } catch (err) {
    console.error("[notify-pending-approval]", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}
