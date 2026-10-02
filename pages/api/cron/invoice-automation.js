// GET /api/cron/invoice-automation?secret=<CRON_SECRET>
// A backup trigger for the invoice sender. The same pass already runs on a
// timer inside the app (utils/invoiceAutomation.js), so this endpoint only
// exists for a server-side cron, e.g. */20 * * * *
import { runInvoiceAutomation } from "@/utils/invoiceAutomation";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).end();

  const secret = req.headers["x-cron-secret"] || req.query.secret;
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const out = await runInvoiceAutomation();
    return res.status(200).json({ success: true, ...out });
  } catch (error) {
    console.error("invoice automation cron:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
