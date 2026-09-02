// pages/api/admin/invoices/[id]/index.js — edit one invoice.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Invoice from "@/models/Invoice";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const FIELDS = ["kind", "svc", "amount", "gstPct", "issued", "due", "status", "paidOn", "method", "ref", "owner", "notes"];

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad invoice id" });
  }

  try {
    if (req.method === "DELETE") {
      await Invoice.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }
    if (req.method !== "PATCH") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const b = req.body || {};
    const set = {};
    for (const k of FIELDS) {
      if (b[k] === undefined) continue;
      set[k] = ["amount", "gstPct"].includes(k) ? Number(b[k] || 0) : b[k];
    }
    // Marking it paid without saying when is the common slip — fill it in.
    if (b.status === "Paid" && !b.paidOn) set.paidOn = new Date().toISOString().slice(0, 10);

    const saved = await Invoice.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    if (!saved) return res.status(404).json({ success: false, message: "Invoice not found" });

    if (b.status === "Paid") {
      await Query.findByIdAndUpdate(saved.leadId, {
        $push: { events: { at: new Date(), type: "invoice", text: `Payment received — ₹${Math.round(saved.amount || 0).toLocaleString("en-IN")}` } },
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      data: {
        ...saved, _id: String(saved._id), leadId: String(saved.leadId),
        proposalId: saved.proposalId ? String(saved.proposalId) : "",
      },
    });
  } catch (error) {
    console.error("invoice patch:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
