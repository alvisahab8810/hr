// models/Invoice.js — money asked for, against an accepted proposal.
//
// An invoice always points at a proposal and, through it, at the lead. The
// advance goes out the moment a proposal is accepted; a retainer then bills one
// invoice a month for the length of the term. The company and contact are
// copied in when it is raised so the paperwork stays correct afterwards.
import mongoose from "mongoose";

const InvoiceSchema = new mongoose.Schema(
  {
    proposalId: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal", default: null, index: true },
    leadId:     { type: mongoose.Schema.Types.ObjectId, ref: "Query", required: true, index: true },

    co: { type: String, default: "" },
    contact: { type: String, default: "" },
    em: { type: String, default: "" },
    ph: { type: String, default: "" },

    // Advance | Monthly | Balance | One time
    kind: { type: String, default: "Advance" },
    monthNo: { type: Number, default: 0 },     // which month of the retainer
    ofMonths: { type: Number, default: 0 },

    svc: { type: String, default: "" },
    amount: { type: Number, default: 0 },      // before tax
    gstPct: { type: Number, default: 18 },

    issued: { type: String, default: "" },     // plain "YYYY-MM-DD", like the lead dates
    due: { type: String, default: "" },

    // Draft | Sent | Partly paid | Paid | Overdue | Cancelled
    status: { type: String, default: "Draft" },

    // Every amount received against this invoice, in the order it came in.
    payments: {
      type: [{
        on: { type: String, default: "" },     // "YYYY-MM-DD"
        amount: { type: Number, default: 0 },
        method: { type: String, default: "" },
        ref: { type: String, default: "" },
        at: { type: Date, default: Date.now },
      }],
      default: [],
    },
    paidOn: { type: String, default: "" },
    method: { type: String, default: "" },     // Bank transfer | UPI | Cheque | Cash
    ref: { type: String, default: "" },        // UTR / cheque number

    owner: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { timestamps: true, collection: "crminvoices" }
);

// NOTE: the payroll Sales module already owns the model name "Invoice" and the
// "invoices" collection (models/sales/Invoice.js). This one is the CRM's own
// billing, so it lives under its own name and its own collection.
export default mongoose.models.CrmInvoice || mongoose.model("CrmInvoice", InvoiceSchema);
