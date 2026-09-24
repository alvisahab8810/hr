// utils/newsletterMail.js — the newsletter that goes out from
// Website → Newsletter. Same transport and the same branded shell the
// proposals use, with one difference: every copy carries its own unsubscribe
// link, signed for that one address.
import { mailTransport, MAIL_USER } from "@/utils/mailer";
import { signEmail } from "@/utils/newsletterToken";

const BRAND = "#5138ee";
const BRAND2 = "#7C5CFF";
const INK = "#04000b";
const LOGO = process.env.MAIL_LOGO || "https://viralon.in/assets/images/brand-logo.png";
// The unsubscribe page lives on the website, not on HQ.
const SITE = process.env.NEWSLETTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://viralon.in";

export function unsubscribeUrl(email) {
  const e = String(email || "").trim().toLowerCase();
  return `${SITE}/api/newsletter/unsubscribe?e=${encodeURIComponent(e)}&t=${signEmail(e)}`;
}

function shell(bodyHtml, link) {
  return `<div style="margin:0;padding:28px 12px;background:#F4F4F9;font-family:Arial,Helvetica,sans-serif;color:${INK};">
    <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #ECECF5;box-shadow:0 6px 24px rgba(81,56,238,.07);">
      <div style="height:5px;background:linear-gradient(90deg,${BRAND},${BRAND2});font-size:0;line-height:0;">&nbsp;</div>
      <div style="padding:22px 30px 6px;">
        <img src="${LOGO}" alt="Viralon" width="70" style="display:block;border:0;outline:none;height:auto;max-width:70px;" />
      </div>
      <div style="padding:14px 30px 30px;font-size:15px;line-height:1.65;">${bodyHtml}</div>
      <div style="padding:16px 30px;background:#FAFAFD;border-top:1px solid #F1F1F8;font-size:12.5px;color:#8A8AA3;">
        Team Viralon · <a href="https://viralon.in" style="color:${BRAND};text-decoration:none;font-weight:700;">viralon.in</a>
        <br />
        You are getting this because you signed up for the Viralon newsletter.
        <a href="${link}" style="color:#8A8AA3;text-decoration:underline;">Unsubscribe</a>
      </div>
    </div>
  </div>`;
}

/* ── The ready-made letters ───────────────────────────────────────────────
   Pick one in the compose box and it fills the subject and the message; the
   sender then edits whatever needs changing. Everything here is ordinary HTML
   — it is dropped inside the branded shell on the way out. */

const button = (label, href) =>
  `<p><a href="${href}" style="display:inline-block;padding:11px 22px;border-radius:9px;background:${BRAND};color:#fff;text-decoration:none;font-weight:700;">${label}</a></p>`;

const sign = `<p style="margin-top:26px;">— Team Viralon<br /><span style="color:#8A8AA3;font-size:13px;">Digital marketing that pulls its weight.</span></p>`;

export const TEMPLATES = [
  {
    id: "blank",
    name: "Blank",
    subject: "",
    body: `<p>Hi there,</p>
<p>Write what you want to say here. Plain HTML works — headings, <strong>bold</strong>, links.</p>
${button("Read more", "https://viralon.in")}
${sign}`,
  },
  {
    id: "roundup",
    name: "Monthly round-up",
    subject: "What we shipped this month at Viralon",
    body: `<h2 style="font-size:21px;margin:0 0 14px;">This month at Viralon</h2>
<p>Hi there,</p>
<p>A short look at what we built, what worked for our clients, and one thing worth stealing for your own marketing.</p>
<table style="width:100%;border-collapse:collapse;font-size:14px;margin:18px 0;background:#FAFAFD;border:1px solid #EFEDFB;border-radius:10px;">
  <tr><td style="padding:12px 14px;"><strong>The work</strong><br />A campaign we ran and the number it moved.</td></tr>
  <tr><td style="padding:12px 14px;border-top:1px solid #EFEDFB;"><strong>The lesson</strong><br />One idea you can use this week.</td></tr>
  <tr><td style="padding:12px 14px;border-top:1px solid #EFEDFB;"><strong>On the blog</strong><br />What we wrote about, in a line.</td></tr>
</table>
${button("Read it on viralon.in", "https://viralon.in/blog")}
${sign}`,
  },
  {
    id: "blog",
    name: "New blog / case study",
    subject: "New on the blog: <the title>",
    body: `<h2 style="font-size:21px;margin:0 0 14px;">&lt;The title of the piece&gt;</h2>
<p>Hi there,</p>
<p>We wrote something new. In one line: what it is about and who it is for.</p>
<p style="padding:14px 16px;border-left:3px solid ${BRAND};background:#FAFAFD;color:#4b4a5c;">
  A pull quote or the one number from the piece that makes someone want to read it.
</p>
${button("Read the full piece", "https://viralon.in/blog")}
${sign}`,
  },
  {
    id: "offer",
    name: "Offer / announcement",
    subject: "Something new from Viralon",
    body: `<h2 style="font-size:21px;margin:0 0 14px;">&lt;What you are announcing&gt;</h2>
<p>Hi there,</p>
<p>Say what it is in two lines — the service, the offer or the date — and what it does for them.</p>
<ul style="padding-left:18px;color:#4b4a5c;">
  <li style="margin-bottom:6px;">What they get</li>
  <li style="margin-bottom:6px;">What it costs, or until when it runs</li>
  <li>What to do next</li>
</ul>
${button("Talk to us", "https://viralon.in/contact-us")}
<p style="font-size:13px;color:#8A8AA3;">Reply to this mail and it reaches a person, not a bot.</p>
${sign}`,
  },
  {
    id: "welcome",
    name: "Thank you / welcome",
    subject: "Thanks for signing up",
    body: `<h2 style="font-size:21px;margin:0 0 14px;">Glad to have you here</h2>
<p>Hi there,</p>
<p>Thanks for joining the Viralon list. Roughly once a month you will get the work we are proud of, what it earned, and one idea you can put to use — nothing else.</p>
${button("See our work", "https://viralon.in")}
${sign}`,
  },
];

/* What the compose box opens with. */
export function newsletterDraft() {
  const t = TEMPLATES[0];
  return { subject: t.subject, body: t.body, templates: TEMPLATES };
}

/* One copy, to one address. The unsubscribe link is personal, and the
   List-Unsubscribe headers let Gmail and Outlook show their own button. */
export function sendNewsletterMail({ to, subject, body, attachments }) {
  const link = unsubscribeUrl(to);
  return mailTransport().sendMail({
    from: `"Viralon" <${MAIL_USER}>`,
    to,
    subject,
    html: shell(body, link),
    ...(attachments && attachments.length ? { attachments } : {}),
    headers: {
      "List-Unsubscribe": `<${link}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}
