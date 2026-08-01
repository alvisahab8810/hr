// GET /api/cron/notify-pending-approvals?secret=viralon_cron_2026
// Set this cron to run once a day in Hostinger, e.g. 0 10 * * *
// Reminds clients (by email) about content stuck in "review" status,
// once per day, until they approve or send feedback.
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  try {
    const r = await fetch(`${baseUrl}/api/admin/tasks/notify-pending-approval`, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": process.env.CRON_SECRET },
      body:    JSON.stringify({}),
    });
    const d = await r.json();
    return res.json(d);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
