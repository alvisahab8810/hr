// pages/api/admin/newsletter/[id].js — update or remove one subscriber.
// PATCH changes the status or the note; DELETE takes the row off the list for
// good (used when an address was a typo or a test — a real person who opted
// out should be left as "unsubscribed" so the footer form can't re-add them
// quietly).
import dbConnect from "@/utils/dbConnect";
import Newsletter from "@/models/Newsletter";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  try {
    const row = await Newsletter.findById(id);
    if (!row) {
      return res.status(404).json({ success: false, message: "Subscriber not found" });
    }

    if (req.method === "PATCH") {
      const b = req.body || {};

      if (b.status === "subscribed" || b.status === "unsubscribed") {
        if (b.status !== row.status) {
          row.status = b.status;
          if (b.status === "unsubscribed") row.unsubscribedAt = new Date();
          else { row.subscribedAt = new Date(); row.unsubscribedAt = null; }
        }
      }
      if (b.notes !== undefined) row.notes = String(b.notes ?? "").trim();

      await row.save();
      return res.status(200).json({ success: true, data: { ...row.toObject(), _id: String(row._id) } });
    }

    if (req.method === "DELETE") {
      await row.deleteOne();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
