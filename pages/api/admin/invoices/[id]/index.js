// pages/api/admin/invoices/[id]/index.js — edit one invoice.
import mongoose from "mongoose";
import { cleanItems, itemsTotal, itemsLabel } from "@/utils/proposalItems";
import dbConnect from "@/utils/dbConnect";
import Invoice from "@/models/Invoice";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";
import { winLeadOnPayment, unwinLeadIfUnpaid } from "@/utils/leadWon";

const FIELDS = ["kind", "svc", "amount", "discPct", "discAmt", "gstPct", "issued", "due", "status", "paidOn", "method", "ref", "owner", "notes",
  "co", "contact", "em", "ph", "poRef", "billTo"];

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad invoice id" });
  }

  // The document belongs to a lead, and the lead has an owner.
  const parent = await Invoice.findById(id).select("leadId").lean();
  if (parent && !(await ownsLead(req, res, parent.leadId))) return;

  try {
    if (req.method === "DELETE") {
      await Invoice.findByIdAndDelete(id);
      // The invoice held the advance, so the lead's win went with it.
      if (parent?.leadId) {
        await Query.findByIdAndUpdate(parent.leadId, {
          $push: { events: { at: new Date(), type: "invoice", text: "Invoice deleted" } },
        }).catch(() => {});
        await unwinLeadIfUnpaid(parent.leadId);
      }
      return res.status(200).json({ success: true });
    }
    if (req.method !== "PATCH") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const b = req.body || {};

    // A part payment is pushed onto the history, and the status follows the
    // running total: anything short of the full amount is "Partly paid".
    if (b.payment) {
      const inv = await Invoice.findById(id).lean();
      if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });
      const amt = Math.round(Number(b.payment.amount || 0));
      if (!(amt > 0)) return res.status(400).json({ success: false, message: "Enter the amount that came in" });

      const total = Math.round((inv.amount || 0) + ((inv.amount || 0) * (inv.gstPct || 0)) / 100);
      const paid = (inv.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0) + amt;
      const on = b.payment.on || new Date().toISOString().slice(0, 10);
      const row = { on, amount: amt, method: b.payment.method || "", ref: b.payment.ref || "", at: new Date() };
      const done = paid >= total;

      const out = await Invoice.findByIdAndUpdate(id, {
        $push: { payments: row },
        $set: { status: done ? "Paid" : "Partly paid", paidOn: done ? on : "", method: row.method, ref: row.ref },
      }, { new: true }).lean();

      await Query.findByIdAndUpdate(out.leadId, {
        $push: { events: { at: new Date(), type: "invoice", text: `${done ? "Payment received" : "Part payment received"} — ₹${amt.toLocaleString("en-IN")}` } },
      }).catch(() => {});

      // Money in is what wins the lead — nothing else does.
      await winLeadOnPayment(out.leadId, `Advance received — ₹${amt.toLocaleString("en-IN")}`);

      // The board has to be able to say so; the rep recorded a payment, not a
      // status change, and would otherwise never learn the lead just won.
      const after = await Query.findById(out.leadId).select("status").lean();

      return res.status(200).json({
        success: true,
        leadStatus: after?.status || "",
        data: { ...out, _id: String(out._id), leadId: String(out.leadId), proposalId: out.proposalId ? String(out.proposalId) : "" },
      });
    }

    // A single row of the history can be corrected or removed. The status is
    // recomputed from whatever total is left, exactly as a fresh payment does.
    if (b.editPayment || b.deletePayment) {
      const doc = await Invoice.findById(id);
      if (!doc) return res.status(404).json({ success: false, message: "Invoice not found" });

      const q = b.editPayment || b.deletePayment;
      const list = doc.payments || [];
      const n = q._id
        ? list.findIndex((p) => String(p._id) === String(q._id))
        : Number(q.idx);
      if (!(n >= 0 && n < list.length)) {
        return res.status(400).json({ success: false, message: "That payment record is no longer there" });
      }

      if (b.deletePayment) {
        list.splice(n, 1);
      } else {
        if (q.amount !== undefined) {
          const amt = Math.round(Number(q.amount || 0));
          if (!(amt > 0)) return res.status(400).json({ success: false, message: "Enter the amount that came in" });
          list[n].amount = amt;
        }
        if (q.on !== undefined) list[n].on = q.on;
        if (q.method !== undefined) list[n].method = q.method;
        if (q.ref !== undefined) list[n].ref = q.ref;
      }

      const total = Math.round((doc.amount || 0) + ((doc.amount || 0) * (doc.gstPct || 0)) / 100);
      const paid = list.reduce((t, p) => t + Number(p.amount || 0), 0);
      const last = list[list.length - 1];
      const done = paid > 0 && paid >= total;
      doc.status = paid <= 0
        ? (doc.status === "Cancelled" || doc.status === "Draft" ? doc.status : "Sent")
        : done ? "Paid" : "Partly paid";
      doc.paidOn = done && last ? (last.on || "") : "";
      doc.method = last ? last.method || "" : "";
      doc.ref = last ? last.ref || "" : "";
      doc.markModified("payments");
      const saved0 = await doc.save();
      const out = saved0.toObject();
      // Money corrected downwards can take the win with it.
      if (paid > 0) await winLeadOnPayment(out.leadId);
      else await unwinLeadIfUnpaid(out.leadId);
      return res.status(200).json({
        success: true,
        data: { ...out, _id: String(out._id), leadId: String(out.leadId), proposalId: out.proposalId ? String(out.proposalId) : "" },
      });
    }

    // Undoing a payment run clears the history with it.
    if (b.clearPayments) {
      const out = await Invoice.findByIdAndUpdate(id, {
        $set: { payments: [], status: b.status || "Sent", paidOn: "", method: "", ref: "" },
      }, { new: true }).lean();
      if (!out) return res.status(404).json({ success: false, message: "Invoice not found" });
      // Nothing was received after all, so the lead cannot stay Won.
      await Query.findByIdAndUpdate(out.leadId, {
        $push: { events: { at: new Date(), type: "invoice", text: "Payment records cleared" } },
      }).catch(() => {});
      await unwinLeadIfUnpaid(out.leadId);
      return res.status(200).json({
        success: true,
        data: { ...out, _id: String(out._id), leadId: String(out.leadId), proposalId: out.proposalId ? String(out.proposalId) : "" },
      });
    }

    // The dispute hold is its own little transaction: the flag, the reason and
    // a line on the lead's timeline, so a silence nobody can explain later is
    // never the result of this.
    if (b.disputed !== undefined) {
      const inv = await Invoice.findById(id).select("leadId disputed").lean();
      if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });
      const on = !!b.disputed;
      const why = String(b.disputeNote || "").trim();
      const out = await Invoice.findByIdAndUpdate(id, {
        $set: {
          disputed: on,
          disputeNote: on ? why : "",
          disputedAt: on ? new Date() : null,
        },
      }, { new: true }).lean();
      if (inv.leadId && on !== !!inv.disputed) {
        await Query.findByIdAndUpdate(inv.leadId, {
          $push: { events: { at: new Date(), type: "invoice",
            text: on
              ? `Invoice in dispute — reminders held${why ? `: ${why}` : ""}`
              : "Dispute settled — reminders resumed" } },
        }).catch(() => {});
      }
      return res.status(200).json({
        success: true,
        data: { ...out, _id: String(out._id), leadId: String(out.leadId), proposalId: out.proposalId ? String(out.proposalId) : "" },
      });
    }

    const set = {};
    // Lines rule the total, exactly as they do on a proposal, and the discount
    // comes off it before tax. Either one moving has to re-work the amount, so
    // the saved row is read back when only the discount was typed — otherwise
    // the percentage would print against a total it was never taken off.
    if (b.items !== undefined || b.discPct !== undefined) {
      const row = await Invoice.findById(id).select("items amount discPct discAmt").lean();
      const items = cleanItems(b.items !== undefined ? b.items : row?.items);
      if (b.items !== undefined) {
        b.items = items;
        b.svc = itemsLabel(items);
      }
      // A line-less invoice carries one amount, and that amount is already net
      // of whatever discount was taken, so the gross has to be put back first.
      const gross = items.length ? itemsTotal(items) : Number(row?.amount || 0) + Number(row?.discAmt || 0);
      const pct = Math.min(100, Math.max(0, Number(b.discPct ?? row?.discPct ?? 0)));
      b.discPct = pct;
      b.discAmt = Math.round((gross * pct) / 100);
      b.amount = gross - b.discAmt;
    }
    for (const k of FIELDS.concat(b.items !== undefined ? ["items"] : [])) {
      if (b[k] === undefined) continue;
      set[k] = ["amount", "discPct", "discAmt", "gstPct"].includes(k) ? Number(b[k] || 0) : b[k];
    }
    // Marking it paid without saying when is the common slip — fill it in.
    if (b.status === "Paid" && !b.paidOn) set.paidOn = new Date().toISOString().slice(0, 10);

    // Needed to tell a fresh "Sent" from a re-save of one already sent.
    const current = await Invoice.findById(id).select("status").lean();
    const saved = await Invoice.findByIdAndUpdate(id, { $set: set }, { new: true }).lean();
    if (!saved) return res.status(404).json({ success: false, message: "Invoice not found" });

    // Moving one to Sent only notes it on the lead — the mail itself goes out
    // from the compose box on the invoices page.
    if (b.status === "Sent" && current?.status !== "Sent") {
      await Query.findByIdAndUpdate(saved.leadId, {
        $push: { events: { at: new Date(), type: "invoice", text: "Invoice marked as sent" } },
      }).catch(() => {});
    }

    if (b.status === "Paid") {
      await Query.findByIdAndUpdate(saved.leadId, {
        $push: { events: { at: new Date(), type: "invoice", text: `Payment received — ₹${Math.round(saved.amount || 0).toLocaleString("en-IN")}` } },
      }).catch(() => {});
      await winLeadOnPayment(saved.leadId, `Advance received — ₹${Math.round(saved.amount || 0).toLocaleString("en-IN")}`);
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
