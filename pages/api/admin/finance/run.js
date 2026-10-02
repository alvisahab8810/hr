// pages/api/admin/finance/run.js — the "Run now" button on the invoice sender.
// The pass is the same one the timer and the cron call; forcing it only skips
// the time-of-day window, because somebody is standing there asking for it.
// Nothing is ever mailed twice either way — every rung is recorded on the
// invoice (utils/invoiceAutomation.js).
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { readSales } from "@/utils/salesAuth";
import { runInvoiceAutomation } from "@/utils/invoiceAutomation";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method not allowed" });
  if (readSales(req.headers.cookie || "")) {
    return res.status(403).json({ success: false, message: "Only an admin can run the invoice sender" });
  }

  try {
    const out = await runInvoiceAutomation({ force: true });
    return res.status(200).json({ success: true, ...out });
  } catch (error) {
    console.error("finance run:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
