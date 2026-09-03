// models/Proposal.js — a priced offer raised off a lead (Website → Proposals).
// A proposal always belongs to a lead in the "queries" collection; the company
// and contact are copied in at the time it is raised so the paperwork still
// reads correctly if the lead is edited later.
//
// Life of one: the rep raises it → it waits in the admin queue → the admin
// approves (or asks for changes, or rejects) → only then can it be sent → the
// client accepts or it goes cold.
import mongoose from "mongoose";

const FollowupSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    // "mail" | "call" | "reply" — a reply is the client talking back.
    type: { type: String, default: "mail" },
    text: { type: String, default: "" },
    by: { type: String, default: "" },
  },
  { _id: false }
);

const ProposalSchema = new mongoose.Schema(
  {
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: "Query", required: true, index: true },

    // Snapshot of the lead at the moment the proposal was raised.
    co: { type: String, default: "" },
    contact: { type: String, default: "" },
    em: { type: String, default: "" },
    ph: { type: String, default: "" },

    svc: { type: String, default: "" },
    amount: { type: Number, default: 0 },          // total value, ₹
    term: { type: String, default: "Retainer" },   // Retainer | One-off | Project
    months: { type: Number, default: 1 },
    advPct: { type: Number, default: 0 },          // advance %

    approval: { type: String, default: "Awaiting approval" }, // Awaiting approval | Approved | Changes requested | Rejected
    approvedBy: { type: String, default: "" },
    approvedOn: { type: Date, default: null },
    adminNote: { type: String, default: "" },

    status: { type: String, default: "Draft" },    // Draft | Sent | Accepted | Lost
    sent: { type: Date, default: null },
    nextfu: { type: String, default: "" },         // plain "YYYY-MM-DD", like the lead dates
    validTill: { type: String, default: "" },

    // Once the client accepts, the agreement goes out and comes back either
    // signed off or refused. "Not sent" until anyone touches it.
    agreement: {
      // Not sent | Draft | Sent | Follow up | Approved | Rejected
      status:    { type: String, default: "Not sent" },
      title:     { type: String, default: "" },
      startDate: { type: String, default: "" },   // "YYYY-MM-DD"
      endDate:   { type: String, default: "" },
      clauses:   { type: [{ h: String, t: String }], default: [] },
      createdOn: { type: Date, default: null },
      sentOn:    { type: Date, default: null },
      fuOn:      { type: String, default: "" },   // next follow-up date
      decidedOn: { type: Date, default: null },
      note:      { type: String, default: "" },
    },

    owner: { type: String, default: "" },
    notes: { type: String, default: "" },

    followups: { type: [FollowupSchema], default: [] },
  },
  { timestamps: true, collection: "proposals" }
);

// Schema changes must take effect on a dev reload, like models/BookingSlot.js.
if (process.env.NODE_ENV !== "production" && mongoose.models.Proposal) {
  delete mongoose.models.Proposal;
}

export default mongoose.models.Proposal || mongoose.model("Proposal", ProposalSchema);
