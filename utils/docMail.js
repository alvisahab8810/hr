// utils/docMail.js — the mails a proposal or an invoice sends on its own.
// A document only leaves the building when its status is moved to "Sent", so
// both helpers are called from that one place in the PATCH routes.
import { mailTransport, MAIL_USER } from "@/utils/mailer";
import { docAttachment } from "@/utils/docPdf";

const BRAND = "#5138ee";
const INK = "#04000b";
const BRAND2 = "#7C5CFF";
// A public https URL — mail clients cannot read local files.
const LOGO = process.env.MAIL_LOGO || "https://hq.viralon.in/assets/images/logo.png";
const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

function shell(bodyHtml) {
  return `<div style="margin:0;padding:28px 12px;background:#F4F4F9;font-family:Arial,Helvetica,sans-serif;color:${INK};">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ECECF5;box-shadow:0 6px 24px rgba(81,56,238,.07);">
      <div style="height:5px;background:linear-gradient(90deg,${BRAND},${BRAND2});font-size:0;line-height:0;">&nbsp;</div>
      <div style="padding:22px 30px 6px;">
        <img src="${LOGO}" alt="Viralon" width="132" style="display:block;border:0;outline:none;height:auto;max-width:132px;" />
      </div>
      <div style="padding:14px 30px 30px;font-size:15px;line-height:1.65;">${bodyHtml}</div>
      <div style="padding:16px 30px;background:#FAFAFD;border-top:1px solid #F1F1F8;font-size:12.5px;color:#8A8AA3;">
        Team Viralon · <a href="https://viralon.in" style="color:${BRAND};text-decoration:none;font-weight:700;">viralon.in</a>
      </div>
    </div>
  </div>`;
}

const row = (k, v) =>
  `<tr><td style="padding:9px 14px;color:#6b6880;">${k}</td><td style="padding:9px 14px;font-weight:700;text-align:right;">${v}</td></tr>`;

function send({ to, subject, html, name, attachments }) {
  if (!to) return Promise.resolve(null);
  return mailTransport().sendMail({
    from: `"${name}" <${MAIL_USER}>`,
    to,
    subject,
    html: shell(html),
    ...(attachments && attachments.length ? { attachments } : {}),
  });
}

const code = (p, pre) => `${pre}-${String(p?._id || "").slice(-4).toUpperCase()}`;

/* ── the drafts ───────────────────────────────────────────────────────────
   Each returns what the compose box opens with: the client's address, the
   subject and the body. The body is plain HTML the sender can edit; it is
   dropped into the branded shell on the way out. */

const first = (n) => String(n || "there").trim().split(/\s+/)[0] || "there";

function detailTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0;background:#FAFAFD;border:1px solid #EFEDFB;border-radius:10px;">
    ${rows.filter(Boolean).map(([k, v]) => row(k, v)).join("")}
  </table>`;
}

export function proposalDraft(p) {
  const months = Number(p?.months || 1);
  const adv = Number(p?.advPct || 0);
  return {
    to: p?.em || "",
    subject: `Your proposal${p?.co ? ` — ${p.co}` : ""}`,
    fileName: `${code(p, "VP")}.pdf`,
    body: `<p>Hi ${first(p?.contact)},</p>
<p>Thanks for your time. Here's the proposal we discussed${p?.co ? ` for <strong>${p.co}</strong>` : ""}. The full document is attached as a PDF.</p>
${detailTable([
  ["Service", p?.svc || "—"],
  ["Value", rupee(p?.amount)],
  ["Terms", `${p?.term || "Retainer"}${months > 1 ? ` · ${months} months` : ""}`],
  adv ? ["Advance", `${adv}%`] : null,
  p?.validTill ? ["Valid till", p.validTill] : null,
])}
${p?.notes ? `<p>${String(p.notes).replace(/\n/g, "<br/>")}</p>` : ""}
<p>Reply to this mail with a yes and we'll get started, or tell us what you'd like changed.</p>`,
  };
}

export function agreementDraft(p) {
  const g = p?.agreement || {};
  const months = Number(p?.months || 1);
  return {
    to: p?.em || "",
    subject: `${g.title || "Agreement"} for signature${p?.co ? ` — ${p.co}` : ""}`,
    fileName: `${code(p, "VA")}.pdf`,
    body: `<p>Hi ${first(p?.contact)},</p>
<p>Thanks for accepting the proposal. Here is the agreement${p?.co ? ` for <strong>${p.co}</strong>` : ""}, attached as a PDF.</p>
${detailTable([
  ["Agreement no.", code(p, "VA")],
  ["Service", p?.svc || "—"],
  ["Value", rupee(p?.amount)],
  ["Terms", `${p?.term || "Retainer"}${months > 1 ? ` · ${months} months` : ""}`],
  g.startDate ? ["Starts on", g.startDate] : null,
  g.endDate ? ["Ends on", g.endDate] : null,
])}
${g.note ? `<p>${String(g.note).replace(/\n/g, "<br/>")}</p>` : ""}
<p>Please go through it, sign the client block and send a scanned copy back to this mail. Tell us if anything needs changing.</p>`,
  };
}

export function invoiceDraft(inv) {
  const gst = Math.round((Number(inv?.amount || 0) * Number(inv?.gstPct || 0)) / 100);
  const total = Math.round(Number(inv?.amount || 0)) + gst;
  const paid = (inv?.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0);
  const left = Math.max(0, total - paid);
  const part = paid > 0 && left > 0;
  const full = paid > 0 && left <= 0;
  return {
    to: inv?.em || "",
    subject: part
      ? `Part payment received${inv?.co ? ` — ${inv.co}` : ""} · ${rupee(paid)} of ${rupee(total)}`
      : full
        ? `Paid in full — invoice from Viralon${inv?.co ? ` · ${inv.co}` : ""}`
        : `Invoice from Viralon${inv?.co ? ` — ${inv.co}` : ""} · ${rupee(total)}`,
    fileName: `INV-${String(inv?._id || "").slice(-4).toUpperCase()}.pdf`,
    body: `<p>Hi ${first(inv?.contact)},</p>
<p>${part
  ? `Thank you — we have received ${rupee(paid)} against your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""}. The updated invoice is attached.`
  : full
    ? `Thank you — your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""} is now settled in full. The receipted invoice is attached.`
    : `Here is your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""}, attached as a PDF.`}</p>
${detailTable([
  ["For", inv?.svc || "—"],
  ["Type", inv?.kind || "Invoice"],
  ["Amount", rupee(inv?.amount)],
  inv?.gstPct ? [`GST (${inv.gstPct}%)`, rupee(gst)] : null,
  ["Invoice total", rupee(total)],
  paid ? ["Received so far", rupee(paid)] : null,
  paid ? [left > 0 ? "Balance due" : "Balance", rupee(left)] : null,
  inv?.issued ? ["Issued", inv.issued] : null,
  inv?.due ? ["Due by", inv.due] : null,
])}
${(inv?.payments || []).length
  ? detailTable((inv.payments).map((p) => [`Received ${p.on || ""}${p.method ? ` · ${p.method}` : ""}${p.ref ? ` · ${p.ref}` : ""}`, rupee(p.amount)]))
  : ""}
${inv?.notes ? `<p>${String(inv.notes).replace(/\n/g, "<br/>")}</p>` : ""}
${full ? "" : "<p>Once the transfer is done, reply with the reference and we'll mark it received.</p>"}`,
  };
}

const DRAFT = { proposal: proposalDraft, agreement: agreementDraft, invoice: invoiceDraft };
const SENDER = { proposal: "Viralon", agreement: "Viralon", invoice: "Viralon Accounts" };

export function docDraft(kind, doc) {
  return (DRAFT[kind] || proposalDraft)(doc);
}

/* Send what the compose box holds, with the document attached. */
export function sendDocMail(kind, doc, { to, subject, body } = {}) {
  const d = docDraft(kind, doc);
  return send({
    to: to || d.to,
    name: SENDER[kind] || "Viralon",
    subject: subject || d.subject,
    html: body || d.body,
    attachments: docAttachment(kind, doc, d.fileName),
  });
}

/* Kept for the places that mail without anyone watching. */
export const sendProposalMail = (p) => sendDocMail("proposal", p);
export const sendAgreementMail = (p) => sendDocMail("agreement", p);
export const sendInvoiceMail = (inv) => sendDocMail("invoice", inv);
