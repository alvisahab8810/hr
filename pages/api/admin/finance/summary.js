// pages/api/admin/finance/summary.js — everything the Financial dashboard draws.
// One round trip, like the rest of the CRM: the invoices with the mails already
// sent against them, the leads they belong to, and the sender's own settings so
// the screen can say when the next run is due.
import dbConnect from "@/utils/dbConnect";
import Invoice from "@/models/Invoice";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { readSales } from "@/utils/salesAuth";
import { getSettings } from "@/pages/api/admin/settings";
import { nextRunAt, windowOpen, istDay } from "@/utils/invoiceAutomation";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "Method not allowed" });

  // The money is the admin's business. A salesperson has their own cut-down
  // report and no reason to be on this screen at all.
  if (readSales(req.headers.cookie || "")) {
    return res.status(403).json({ success: false, message: "The financial dashboard is admin only" });
  }

  await dbConnect();
  try {
    const [invoices, leads, settings] = await Promise.all([
      Invoice.find({}).sort({ createdAt: -1 }).lean(),
      Query.find({}).select("name businessName email status").lean(),
      getSettings(),
    ]);
    const billing = settings.billing || {};

    return res.status(200).json({
      success: true,
      today: istDay(),
      billing,
      sender: { next: nextRunAt(billing), open: windowOpen(billing) },
      data: invoices.map((i) => ({
        ...i,
        _id: String(i._id),
        leadId: String(i.leadId),
        proposalId: i.proposalId ? String(i.proposalId) : "",
        mailsSent: (i.mailsSent || []).map((m) => ({ key: m.key, at: m.at })),
      })),
      leads: leads.map((l) => ({ ...l, _id: String(l._id) })),
    });
  } catch (error) {
    console.error("finance summary:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
