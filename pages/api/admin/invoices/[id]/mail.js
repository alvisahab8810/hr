// pages/api/admin/invoices/[id]/mail.js — the compose box behind an invoice.
// GET hands back the draft, POST sends the edited copy with the PDF attached.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Invoice from "@/models/Invoice";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";
import { docDraft, sendDocMail } from "@/utils/docMail";

// A mail can be sent for one payment record — the client then sees the invoice
// as it stood at that point, with the payments up to and including that row.
function asOfPayment(inv, paymentId) {
  if (!paymentId) return inv;
  const list = inv.payments || [];
  const n = list.findIndex((p) => String(p._id) === String(paymentId));
  if (n < 0) return inv;
  return { ...inv, payments: list.slice(0, n + 1) };
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad invoice id" });
  }

  const inv = await Invoice.findById(id).lean();
  if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });
  if (!(await ownsLead(req, res, inv.leadId))) return;

  try {
    if (req.method === "GET") {
      return res.status(200).json({ success: true, draft: docDraft("invoice", asOfPayment(inv, req.query.paymentId)) });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const { to, subject, body, markSent, paymentId } = req.body || {};
    if (!to) return res.status(400).json({ success: false, message: "There is no address to send it to" });

    await sendDocMail("invoice", asOfPayment(inv, paymentId), { to, subject, body });

    // Never walk a paid or part-paid invoice back to Sent.
    if (markSent && inv.status === "Draft") {
      await Invoice.findByIdAndUpdate(id, { $set: { status: "Sent" } });
    }

    await Query.findByIdAndUpdate(inv.leadId, {
      $push: { events: { at: new Date(), type: "invoice", text: `Invoice mailed to ${to}` } },
    }).catch(() => {});

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error("invoice mail:", e?.message);
    return res.status(500).json({ success: false, message: e?.message || "The mail did not go out" });
  }
}
