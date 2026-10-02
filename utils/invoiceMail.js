// utils/invoiceMail.js — the wording of the mails the invoice sender sends.
//
// The compose box on the invoices board already has its own draft
// (utils/docMail.js, invoiceDraft). This file is only for the mails nobody is
// watching: the first copy of a new invoice, and the due-date chases after it.
// They carry the same PDF and the same branded shell — only the words differ,
// because a reminder has to say which side of the due date it is on.
import { sendDocMail } from "@/utils/docMail";

const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const first = (n) => String(n || "there").trim().split(/\s+/)[0] || "there";

export const invoiceTotal = (inv) =>
  Math.round(Number(inv?.amount || 0) * (1 + Number(inv?.gstPct || 0) / 100));
export const invoicePaid = (inv) =>
  (inv?.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0);
export const invoiceLeft = (inv) => Math.max(0, invoiceTotal(inv) - invoicePaid(inv));

/* What each rung of the ladder is called, in words a client can read. The keys
   are the ones written into invoice.mailsSent, so they must never change once
   they are in the database. */
export function rungLabel(key) {
  if (key === "invoice") return "Invoice sent";
  if (key === "due-0") return "Reminder · due today";
  if (key.startsWith("due-b")) {
    const d = Number(key.slice(5));
    return `Reminder · ${d} day${d === 1 ? "" : "s"} before due`;
  }
  if (key.startsWith("due-a")) {
    const d = Number(key.slice(5));
    return `Overdue chase · ${d} day${d === 1 ? "" : "s"} late`;
  }
  return key;
}

/* The body of one reminder. `days` is signed: positive means the due date is
   still ahead, 0 is the day itself, negative means it has passed. */
function reminderBody(inv, days) {
  const left = invoiceLeft(inv);
  const paid = invoicePaid(inv);
  const when =
    days > 0
      ? `is due on <strong>${inv.due}</strong>, ${days} day${days === 1 ? "" : "s"} from now`
      : days === 0
        ? `falls due <strong>today</strong>`
        : `was due on <strong>${inv.due}</strong>, ${-days} day${days === -1 ? "" : "s"} ago`;

  const opening =
    days >= 0
      ? `<p>Hi ${first(inv.contact)},</p><p>A quick note that your invoice${inv.co ? ` for <strong>${inv.co}</strong>` : ""} ${when}.</p>`
      : `<p>Hi ${first(inv.contact)},</p><p>Your invoice${inv.co ? ` for <strong>${inv.co}</strong>` : ""} ${when} and is still showing as unpaid at our end.</p>`;

  return `${opening}
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0;background:#FAFAFD;border:1px solid #EFEDFB;border-radius:10px;">
  <tr><td style="padding:9px 14px;color:#6b6880;">For</td><td style="padding:9px 14px;font-weight:700;text-align:right;">${inv.svc || "—"}</td></tr>
  <tr><td style="padding:9px 14px;color:#6b6880;">Invoice total</td><td style="padding:9px 14px;font-weight:700;text-align:right;">${rupee(invoiceTotal(inv))}</td></tr>
  ${paid ? `<tr><td style="padding:9px 14px;color:#6b6880;">Received so far</td><td style="padding:9px 14px;font-weight:700;text-align:right;">${rupee(paid)}</td></tr>` : ""}
  <tr><td style="padding:9px 14px;color:#6b6880;">Amount payable</td><td style="padding:9px 14px;font-weight:700;text-align:right;">${rupee(left)}</td></tr>
  <tr><td style="padding:9px 14px;color:#6b6880;">Due by</td><td style="padding:9px 14px;font-weight:700;text-align:right;">${inv.due || "—"}</td></tr>
</table>
<p>The invoice is attached again for your records. ${
    days < 0
      ? "If it has already been paid, reply with the reference and we'll mark it off straight away."
      : "Once the transfer is done, reply with the reference and we'll mark it received."
  }</p>`;
}

function reminderSubject(inv, days) {
  const left = rupee(invoiceLeft(inv));
  if (days > 0) return `Payment due ${days === 1 ? "tomorrow" : `in ${days} days`}${inv.co ? ` — ${inv.co}` : ""} · ${left}`;
  if (days === 0) return `Payment due today${inv.co ? ` — ${inv.co}` : ""} · ${left}`;
  return `Payment overdue${inv.co ? ` — ${inv.co}` : ""} · ${left}`;
}

/* The two sends. Both go through sendDocMail, so the PDF, the branding and the
   from-address are exactly what the manual compose box produces. */

export function sendScheduledInvoice(inv, { cc } = {}) {
  return sendDocMail("invoice", inv, { to: inv.em, cc });
}

export function sendInvoiceReminder(inv, days, { cc } = {}) {
  return sendDocMail("invoice", inv, {
    to: inv.em,
    cc,
    subject: reminderSubject(inv, days),
    body: reminderBody(inv, days),
  });
}
