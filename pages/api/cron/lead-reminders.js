// GET /api/cron/lead-reminders?secret=<CRON_SECRET>
// A backup trigger for the lead mails. The same pass already runs on a timer
// inside the app (utils/leadAutomation.js), so this endpoint only exists for a
// server-side cron, e.g. */15 * * * *
import { runLeadAutomation } from "@/utils/leadAutomation";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const out = await runLeadAutomation();
    return res.status(200).json({ success: true, ...out });
  } catch (error) {
    console.error("lead reminders cron:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
