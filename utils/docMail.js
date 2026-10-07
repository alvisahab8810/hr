// utils/docMail.js — the mails a proposal or an invoice sends on its own.
// A document only leaves the building when its status is moved to "Sent", so
// both helpers are called from that one place in the PATCH routes.
import { mailTransport, MAIL_USER } from "@/utils/mailer";
import { docAttachment, loadCompany } from "@/utils/docPdf";
import { invoiceNo } from "@/utils/invoiceNo";

const BRAND = "#5138ee";
const INK = "#04000b";
const BRAND2 = "#7C5CFF";
// A public https URL — mail clients cannot read local files.
const LOGO = process.env.MAIL_LOGO || "https://viralon.in/assets/images/brand-logo.png";
const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

function shell(bodyHtml) {
  return `<div style="margin:0;padding:28px 12px;background:#F4F4F9;font-family:Arial,Helvetica,sans-serif;color:${INK};">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ECECF5;box-shadow:0 6px 24px rgba(81,56,238,.07);">
      <div style="height:5px;background:linear-gradient(90deg,${BRAND},${BRAND2});font-size:0;line-height:0;">&nbsp;</div>
      <div style="padding:22px 30px 6px;">
        <img src="${LOGO}" alt="Viralon" width="70" style="display:block;border:0;outline:none;height:auto;max-width:70px;" />
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

function send({ to, cc, subject, html, name, attachments }) {
  if (!to) return Promise.resolve(null);
  return mailTransport().sendMail({
    from: `"${name}" <${MAIL_USER}>`,
    to,
    // Accounts keeps a copy of whatever the scheduled sender sends, so an
    // unattended mail is not invisible to the people who have to chase it.
    ...(cc ? { cc } : {}),
    subject,
    html: shell(html),
    ...(attachments && attachments.length ? { attachments } : {}),
  });
}

const code = (p, pre) => `${pre}-${String(p?._id || "").slice(-4).toUpperCase()}`;

/* ── the drafts ───────────────────────────────────────────────────────────
   Each returns what the compose box opens with: the client's address, the
   subject and the body. The body is dropped into the branded shell on the
   way out. */

const first = (n) => String(n || "there").trim().split(/\s+/)[0] || "there";

function detailTable(rows) {
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0;background:#FAFAFD;border:1px solid #EFEDFB;border-radius:10px;">
    ${rows.filter(Boolean).map(([k, v]) => row(k, v)).join("")}
  </table>`;
}

/* The compose box belongs to salespeople, not to anyone who writes HTML, so a
   draft comes back as ordered parts rather than one blob of markup. The prose
   parts open in the same rich editor the rest of the dashboard uses; the
   figures carry `lock` and are shown read-only, because they are the
   document's own numbers and retyping them in the mail is how a mail ends up
   disagreeing with the PDF attached to it. `body` is still those parts joined,
   so anything that sends a draft untouched carries on working. */
const say = (k, label, html) => (html ? { k, label, html } : null);
const figures = (k, label, html) => (html ? { k, label, html, lock: true } : null);

function draft(base, parts) {
  const list = parts.filter(Boolean);
  return { ...base, parts: list, body: list.map((x) => x.html).join("\n") };
}

export function proposalDraft(p) {
  const months = Number(p?.months || 1);
  const adv = Number(p?.advPct || 0);
  return draft(
    {
      to: p?.em || "",
      subject: `Your proposal${p?.co ? ` — ${p.co}` : ""}`,
      fileName: `${code(p, "VP")}.pdf`,
    },
    [
      say("open", "Opening", `<p>Hi ${first(p?.contact)},</p>
<p>Thanks for your time. Here's the proposal we discussed${p?.co ? ` for <strong>${p.co}</strong>` : ""}. The full document is attached as a PDF.</p>`),
      figures("figures", "What you quoted", detailTable([
        ["Service", p?.svc || "—"],
        ["Value", rupee(p?.amount)],
        ["Terms", `${p?.term || "Retainer"}${months > 1 ? ` · ${months} months` : ""}`],
        adv ? ["Advance", `${adv}%`] : null,
        p?.validTill ? ["Valid till", p.validTill] : null,
      ])),
      p?.notes ? say("note", "Your note", `<p>${String(p.notes).replace(/\n/g, "<br/>")}</p>`) : null,
      say("close", "Closing", "<p>Reply to this mail with a yes and we'll get started, or tell us what you'd like changed.</p>"),
    ]
  );
}

export function agreementDraft(p) {
  const g = p?.agreement || {};
  const months = Number(p?.months || 1);
  return draft(
    {
      to: p?.em || "",
      subject: `${g.title || "Agreement"} for signature${p?.co ? ` — ${p.co}` : ""}`,
      fileName: `${code(p, "VA")}.pdf`,
    },
    [
      say("open", "Opening", `<p>Hi ${first(p?.contact)},</p>
<p>Thanks for accepting the proposal. Here is the agreement${p?.co ? ` for <strong>${p.co}</strong>` : ""}, attached as a PDF.</p>`),
      figures("figures", "What the agreement says", detailTable([
        ["Agreement no.", code(p, "VA")],
        ["Service", p?.svc || "—"],
        ["Value", rupee(p?.amount)],
        ["Terms", `${p?.term || "Retainer"}${months > 1 ? ` · ${months} months` : ""}`],
        g.startDate ? ["Starts on", g.startDate] : null,
        g.endDate ? ["Ends on", g.endDate] : null,
      ])),
      g.note ? say("note", "Your note", `<p>${String(g.note).replace(/\n/g, "<br/>")}</p>`) : null,
      say("close", "Closing", "<p>Please go through it, sign the client block and send a scanned copy back to this mail. Tell us if anything needs changing.</p>"),
    ]
  );
}

export function invoiceDraft(inv) {
  const gst = Math.round((Number(inv?.amount || 0) * Number(inv?.gstPct || 0)) / 100);
  const total = Math.round(Number(inv?.amount || 0)) + gst;
  const paid = (inv?.payments || []).reduce((n, p) => n + Number(p.amount || 0), 0);
  const left = Math.max(0, total - paid);
  const part = paid > 0 && left > 0;
  const full = paid > 0 && left <= 0;
  return draft(
    {
      to: inv?.em || "",
      subject: part
        ? `Part payment received${inv?.co ? ` — ${inv.co}` : ""} · ${rupee(paid)} of ${rupee(total)}`
        : full
          ? `Paid in full — invoice from Viralon${inv?.co ? ` · ${inv.co}` : ""}`
          : `Invoice from Viralon${inv?.co ? ` — ${inv.co}` : ""} · ${rupee(total)}`,
      fileName: `${invoiceNo(inv).replace(/[^A-Za-z0-9._-]+/g, "-")}.pdf`,
    },
    [
      say("open", "Opening", `<p>Hi ${first(inv?.contact)},</p>
<p>${part
  ? `Thank you — we have received ${rupee(paid)} against your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""}. The updated invoice is attached.`
  : full
    ? `Thank you — your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""} is now settled in full. The receipted invoice is attached.`
    : `Here is your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""}, attached as a PDF.`}</p>`),
      figures("figures", "What is on the invoice", detailTable([
        ["For", inv?.svc || "—"],
        ["Type", inv?.kind || "Invoice"],
        ["Amount", rupee(inv?.amount)],
        inv?.gstPct ? [`GST (${inv.gstPct}%)`, rupee(gst)] : null,
        ["Invoice total", rupee(total)],
        paid ? ["Received so far", rupee(paid)] : null,
        paid ? [left > 0 ? "Balance due" : "Balance", rupee(left)] : null,
        inv?.issued ? ["Issued", inv.issued] : null,
        inv?.due ? ["Due by", inv.due] : null,
      ])),
      (inv?.payments || []).length
        ? figures("paid", "Payments received", detailTable((inv.payments).map((p) =>
            [`Received ${p.on || ""}${p.method ? ` · ${p.method}` : ""}${p.ref ? ` · ${p.ref}` : ""}`, rupee(p.amount)])))
        : null,
      inv?.notes ? say("note", "Your note", `<p>${String(inv.notes).replace(/\n/g, "<br/>")}</p>`) : null,
      full ? null : say("close", "Closing", "<p>Once the transfer is done, reply with the reference and we'll mark it received.</p>"),
    ]
  );
}

const DRAFT = { proposal: proposalDraft, agreement: agreementDraft, invoice: invoiceDraft };
const SENDER = { proposal: "Viralon", agreement: "Viralon", invoice: "Viralon Accounts" };

export function docDraft(kind, doc) {
  return (DRAFT[kind] || proposalDraft)(doc);
}

/* Send what the compose box holds, with the document attached. */
export async function sendDocMail(kind, doc, { to, cc, subject, body, attachments } = {}) {
  // The PDF prints our GSTIN, bank line and UPI out of Settings, so they have
  // to be in hand before it is drawn.
  await loadCompany();
  const d = docDraft(kind, doc);
  return send({
    to: to || d.to,
    cc,
    name: SENDER[kind] || "Viralon",
    subject: subject || d.subject,
    html: body || d.body,
    attachments: [...(await docAttachment(kind, doc, d.fileName)), ...(attachments || [])],
  });
}

/* Kept for the places that mail without anyone watching. */
export const sendProposalMail = (p) => sendDocMail("proposal", p);
export const sendAgreementMail = (p) => sendDocMail("agreement", p);
export const sendInvoiceMail = (inv) => sendDocMail("invoice", inv);
