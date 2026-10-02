// utils/leadWon.js — the one rule about winning a lead.
//
// A lead is not won when somebody says so, and not when the client says yes
// on a call: it is won when the advance is actually in the bank. Everything
// upstream — an accepted proposal, a conversion to client, a status typed on
// the board — now asks here first, so there is a single answer to "is this
// won?" rather than three screens each deciding for themselves.
//
// The moment a payment is recorded against the lead's invoice, the lead moves
// to Won by itself (pages/api/admin/invoices/[id]/index.js).
import Invoice from "@/models/Invoice";
import Query from "@/models/Query";

// The wording lives with the rest of the board's vocabulary so the screens can
// print it; this module is the half that enforces it.
export { WON_RULE } from "@/utils/leadsMeta";

/* Has any money actually come in against this lead? The advance is the first
   invoice raised, and a part payment of it still counts as the advance being
   in — the client has paid, which is what the rule is about. */
export async function advanceReceived(leadId) {
  const paid = await Invoice.findOne({
    leadId,
    $or: [
      { status: "Paid" },
      { status: "Partly paid" },
      { "payments.0": { $exists: true } },
    ],
  }).select("_id").lean();
  return !!paid;
}

/* Called from the invoice end the moment a payment lands. Forward only — a
   lead already won stays won, and the event is written once. */
export async function winLeadOnPayment(leadId, note) {
  if (!leadId) return;
  await Query.findOneAndUpdate(
    { _id: leadId, status: { $ne: "Won" } },
    {
      $set: { status: "Won" },
      $push: { events: { at: new Date(), type: "status", text: note || "Advance received — lead won" } },
    }
  ).catch(() => {});
}

/* The other half of the same rule. A payment entered by mistake and then
   taken off leaves no advance, so the lead cannot stay Won on the strength of
   money that is not there. It goes back to Negotiation, which is where the
   chasing belongs — a lead converted to a client is left alone, because that
   client record is already out in Operations. */
export async function unwinLeadIfUnpaid(leadId) {
  if (!leadId) return;
  if (await advanceReceived(leadId)) return;
  await Query.findOneAndUpdate(
    { _id: leadId, status: "Won", clientId: { $in: [null, undefined] } },
    {
      $set: { status: "Negotiation" },
      $push: {
        events: {
          at: new Date(),
          type: "status",
          text: "Payment removed — back to Negotiation until the advance is in",
        },
      },
    }
  ).catch(() => {});
}
