// utils/docMail.js — the mails a proposal or an invoice sends on its own.
// A document only leaves the building when its status is moved to "Sent", so
// both helpers are called from that one place in the PATCH routes.
import { mailTransport, MAIL_USER } from "@/utils/mailer";
import { docAttachment, loadCompany } from "@/utils/docPdf";
import { invoiceNo } from "@/utils/invoiceNo";

const BRAND = "#0088FF";
const INK = "#04000b";
const BRAND2 = "#7C5CFF";
// A public https URL — mail clients cannot read local files.
const LOGO = process.env.MAIL_LOGO || "https://viralon.in/assets/images/brand-logo.png";
const rupee = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;

// The pictures have to come from a public https URL -- a mail client cannot
// read a local file, and these assets live with the website.
const MAIL_ASSETS = process.env.MAIL_ASSETS || "https://viralon.in";
const ORANGE = "#FF4D00";
// PNG, not SVG — Gmail drops SVG images. Served by payroll (public/assets).
const VERIFY = `${process.env.MAIL_PAYROLL_ASSETS || "https://hq.viralon.in"}/assets/verify.png`;

const SOCIAL = [
  ["facebook", "https://www.facebook.com/people/Viralon-Digital-Services/61551774960535/"],
  ["instagram", "https://www.instagram.com/viralon_digital_services/"],
  ["youtube", "https://www.youtube.com/@ViralonDigtialServices"],
  ["linkedin", "https://www.linkedin.com/company/viralon-digital-services/"],
]
  .map(
    ([name, href]) =>
      `<a href="${href}" style="text-decoration:none;display:inline-block;margin:0 7px;"><img src="${MAIL_ASSETS}/assets/others/icons/mail/${name}.png" width="20" height="20" alt="${name}" style="display:block;border:0;outline:none;width:20px;height:20px;" /></a>`
  )
  .join("");

/* The headline band: a tick, what happened, and the one figure that matters.
   Flush to the card's edges, so it sits in its own row rather than inside the
   body's padding. */
export function heroBand({ title, amount, sub }) {
  if (!amount) return "";
  return `
    <tr>
      <td align="center" style="padding:26px 24px 28px;background:#754CDA;text-align:center;">
        <img src="${VERIFY}" width="54" height="54" alt="" style="display:block;margin:0 auto 14px;border:0;outline:none;width:54px;height:54px;" />
        <div style="color:#DCEEFF;font-size:13px;line-height:18px;letter-spacing:.3px;">${title}</div>
        <div style="color:#ffffff;font-size:34px;line-height:44px;font-weight:700;padding:2px 0 4px;">${amount}</div>
        <div style="color:#C9E4FF;font-size:12px;line-height:17px;">${sub || ""}</div>
      </td>
    </tr>`;
}

function shell(bodyHtml, hero) {
  return `
<div style="margin:0;padding:26px 12px 30px;background:#F2F2F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" width="580" style="width:100%;max-width:580px;margin:0 auto;background:#ffffff;border-radius:16px;border-collapse:separate;overflow:hidden;">
    <tr>
      <td align="center" style="padding:22px 28px 16px;text-align:center;">
        <img src="${LOGO}" width="70" alt="Viralon" style="display:block;margin:0 auto;border:0;outline:none;width:70px;max-width:70px;height:auto;" />
        <div style="margin:8px 0 0;color:#14121F;font-size:11px;line-height:15px;letter-spacing:.3px;font-weight:600;">Nothing works alone</div>
      </td>
    </tr>
    ${hero || ""}
    <tr>
      <td style="padding:24px 30px 28px;font-size:15px;line-height:24px;color:#3F3D4A;">${bodyHtml}</td>
    </tr>
    <tr>
      <td align="center" style="padding:0 30px 20px;text-align:center;border-top:1px solid #EDEDF1;">
        <p style="margin:18px 0 4px;color:#8A8A94;font-size:12px;line-height:18px;">
          If you have any questions, please email us at
          <a href="mailto:info@viralon.in" style="color:#14121F;text-decoration:none;font-weight:600;">info@viralon.in</a>
        </p>
        <p style="margin:0 0 14px;color:#8A8A94;font-size:12px;line-height:18px;">
          Our team can answer any question about this invoice or your account.
        </p>
        <div style="margin:0 0 4px;">${SOCIAL}</div>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:14px 24px 16px;background:#E8F4FF;text-align:center;">
        <p style="margin:0 0 3px;font-size:12px;line-height:17px;">
          <a href="https://viralon.in" style="color:#0088FF;text-decoration:none;font-weight:600;">Team Viralon &middot; viralon.in</a>
        </p>
        <p style="margin:0;color:#7C879B;font-size:11px;line-height:16px;">
          Sent with the invoice attached. Reply to this mail to reach us directly.
        </p>
      </td>
    </tr>
  </table>
</div>`;
}

const row = (k, v) =>
  `<tr><td style="padding:9px 14px;color:#6b6880;">${k}</td><td style="padding:9px 14px;font-weight:700;text-align:right;">${v}</td></tr>`;

function send({ to, cc, subject, html, name, attachments, hero }) {
  if (!to) return Promise.resolve(null);
  return mailTransport().sendMail({
    from: `"${name}" <${MAIL_USER}>`,
    to,
    // Accounts keeps a copy of whatever the scheduled sender sends, so an
    // unattended mail is not invisible to the people who have to chase it.
    ...(cc ? { cc } : {}),
    subject,
    html: shell(html, hero),
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

// One line of the summary. The last one drops its rule so the block does not
// close on a stray hairline.
const invRow = (k, v, opt = {}) =>
  `<tr>
    <td style="padding:11px 0;color:#6B6B76;font-size:14px;line-height:20px;${opt.last ? "" : "border-bottom:1px solid #EFEFF4;"}">${k}</td>
    <td align="right" style="padding:11px 0;color:${opt.colour || "#14121F"};font-size:14px;line-height:20px;font-weight:${opt.weight || 700};text-align:right;${opt.last ? "" : "border-bottom:1px solid #EFEFF4;"}">${v}</td>
  </tr>`;

function invoiceFigures(inv, { gst, total, paid, left }) {
  const payments = (inv?.payments || []).filter((p) => Number(p.amount));
  return `
<h3 style="margin:26px 0 2px;color:#14121F;font-size:18px;line-height:26px;font-weight:700;">Invoice summary</h3>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:14px 0 0;">
  <tr>
    <td width="50%" style="padding:0 0 14px;border-bottom:1px solid #EFEFF4;">
      <div style="color:#8A8A94;font-size:12px;line-height:17px;">Issued</div>
      <div style="color:#14121F;font-size:14px;line-height:20px;font-weight:700;">${inv?.issued || "—"}</div>
    </td>
    <td width="50%" align="right" style="padding:0 0 14px;border-bottom:1px solid #EFEFF4;text-align:right;">
      <div style="color:#8A8A94;font-size:12px;line-height:17px;">Due by</div>
      <div style="color:#14121F;font-size:14px;line-height:20px;font-weight:700;">${inv?.due || "—"}</div>
    </td>
  </tr>
</table>

<p style="margin:14px 0 2px;color:#14121F;font-size:15px;line-height:22px;font-weight:700;">${inv?.svc || "—"}</p>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:6px 0 0;">
  ${invRow("Type", inv?.kind || "Invoice")}
  ${invRow("Amount", rupee(inv?.amount))}
  ${inv?.gstPct ? invRow(`GST (${inv.gstPct}%)`, rupee(gst)) : ""}
  ${invRow("Invoice total", rupee(total))}
  ${paid ? invRow("Received so far", rupee(paid), { last: !paid }) : ""}
</table>

<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:separate;margin:14px 0 0;background:#FAF8FF;border-radius:10px;">
  <tr>
    <td style="padding:14px 16px;color:#754CDA;font-size:14px;line-height:22px;font-weight:700;">${left > 0 ? "Balance due" : "Balance"}</td>
    <td align="right" style="padding:14px 16px;color:#754CDA;font-size:20px;line-height:26px;font-weight:700;text-align:right;">${rupee(left)}</td>
  </tr>
</table>

${payments.length ? `
<div style="margin:22px 0 0;color:#8A8A94;font-size:11px;line-height:16px;letter-spacing:.6px;text-transform:uppercase;font-weight:700;">Payment received</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:4px 0 0;">
  ${payments
    .map(
      (p, i) => `<tr>
        <td style="padding:10px 0;color:#14121F;font-size:14px;line-height:20px;${i === payments.length - 1 ? "" : "border-bottom:1px solid #EFEFF4;"}">${p.on || ""}</td>
        <td align="center" style="padding:10px 0;color:#6B6B76;font-size:13px;line-height:20px;text-align:center;${i === payments.length - 1 ? "" : "border-bottom:1px solid #EFEFF4;"}">${[p.method, p.ref].filter(Boolean).join(" · ")}</td>
        <td align="right" style="padding:10px 0;color:#00A37A;font-size:14px;line-height:20px;font-weight:700;text-align:right;${i === payments.length - 1 ? "" : "border-bottom:1px solid #EFEFF4;"}">${rupee(p.amount)}</td>
      </tr>`
    )
    .join("")}
</table>` : ""}`;
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
      // The band above the letter: whichever figure the mail is really about.
      hero: heroBand(
        paid
          ? {
              title: full ? "Paid in full" : "Payment received",
              amount: rupee(paid),
              sub: full ? "Thank you — nothing is outstanding" : `Received against your invoice`,
            }
          : { title: "Invoice raised", amount: rupee(total), sub: inv?.due ? `Payable by ${inv.due}` : "" }
      ),
    },
    [
      say("open", "Opening", `<p style="margin:0 0 12px;color:#14121F;font-size:20px;line-height:28px;font-weight:700;">Hi ${first(inv?.contact)},</p>
<p style="margin:0;">${part
  ? `Thank you — we have received ${rupee(paid)} against your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""}. The updated invoice is attached.`
  : full
    ? `Thank you — your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""} is now settled in full. The receipted invoice is attached.`
    : `Here is your invoice${inv?.co ? ` for <strong>${inv.co}</strong>` : ""}, attached as a PDF.`}</p>`),
      figures("figures", "What is on the invoice", invoiceFigures(inv, { gst, total, paid, left })),
      inv?.notes ? say("note", "Your note", `<p style="margin:18px 0 0;">${String(inv.notes).replace(/\n/g, "<br/>")}</p>`) : null,
      full ? null : say("close", "Closing", '<p style="margin:18px 0 0;">Once the transfer is done, reply with the reference and we\'ll mark it received.</p>'),
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
    hero: d.hero,
    attachments: [...(await docAttachment(kind, doc, d.fileName)), ...(attachments || [])],
  });
}

/* Kept for the places that mail without anyone watching. */
export const sendProposalMail = (p) => sendDocMail("proposal", p);
export const sendAgreementMail = (p) => sendDocMail("agreement", p);
export const sendInvoiceMail = (inv) => sendDocMail("invoice", inv);
