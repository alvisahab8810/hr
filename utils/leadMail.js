// utils/leadMail.js — the mails the Leads board sends to a lead.
// The website books nothing: someone from the team rings the lead, agrees how
// and when to meet, and writes it on the lead. These mails follow that — a
// "we'll call you" note while nothing is fixed, then a confirmation and the
// reminder ladder once a meeting is on the calendar.
import { mailTransport, MAIL_FROM, MAIL_USER } from "@/utils/mailer";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://viralon.in";

// Brand colours from the website (public/assets/css/style.css) — these mails go
// to leads, so they read as viralon.in, not as the payroll dashboard.
const BRAND = "#0088FF";
const INK = "#04000b";
const BRAND2 = "#7C5CFF";

export const prettyTime = (t) => {
  const [h, m] = String(t || "").split(":").map(Number);
  if (Number.isNaN(h)) return "";
  const ampm = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${ampm}`;
};

export const prettyDate = (d) => {
  if (!d) return "";
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  });
};

// The logo has to be a public https URL — mail clients cannot read local files.
export const MAIL_LOGO =
  process.env.MAIL_LOGO || "https://viralon.in/assets/images/brand-logo.png";

// The pictures have to come from a public https URL -- a mail client cannot
// read a local file, and these assets live with the website, not with payroll.
const MAIL_ASSETS = process.env.MAIL_ASSETS || "https://viralon.in";
const BANNER = `${MAIL_ASSETS}/assets/others/mail-banner.webp`;
const ORANGE = "#FF4D00";

// facebook / instagram / youtube / linkedin, drawn to PNG because icon fonts
// do not render in mail.
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

// The white card's rounded top edge is part of the banner image, so the
// overlap survives clients that strip CSS backgrounds, media queries and
// negative margins -- which is all three of the things Gmail's phone app
// strips. Image and card are percentages of the same wrapper, so they stay
// aligned at any width.
export function shell(bodyHtml, cta) {
  // Every template opens with "Hi <name>," — it reads as the card's heading
  // rather than as another line of copy.
  const body = String(bodyHtml).replace(
    /^(\s*)<p>(Hi [^<]*)<\/p>/,
    '$1<p style="margin:0 0 14px;color:#14121F;font-size:22px;line-height:30px;font-weight:700;">$2</p>'
  );

  return `
<div style="margin:0;padding:26px 12px 30px;background:#F2F2F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" align="center" width="580" style="width:100%;max-width:580px;margin:0 auto;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:0;font-size:0;line-height:0;">
        <img src="${BANNER}" width="580" alt="" style="display:block;width:100%;max-width:580px;height:auto;border-radius:16px 16px 0 0;border:0;outline:none;" />
      </td>
    </tr>
    <tr>
      <td align="center" style="padding:0;text-align:center;">

  <table role="presentation" cellpadding="0" cellspacing="0" align="center" width="93%" style="width:93.1%;max-width:540px;background:#ffffff;border-radius:0 0 16px 16px;text-align:left;">
    <tr>
      <td align="center" style="padding:16px 28px 2px;text-align:center;">
        <img src="${MAIL_LOGO}" width="70" alt="Viralon" style="display:block;margin:0 auto;border:0;outline:none;width:70px;max-width:70px;height:auto;" />
        <div style="margin:8px 0 0;color:#14121F;font-size:11px;line-height:15px;letter-spacing:.3px;font-weight:600;">Nothing works alone</div>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:22px 30px 26px;text-align:center;color:#3F3D4A;font-size:15px;line-height:24px;">
        ${body}
        ${cta ? `<div style="margin:26px 0 4px;">
          <a href="${cta.href}" style="display:inline-block;background:${ORANGE};color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:9px;font-weight:700;font-size:15px;">${cta.label}</a>
        </div>` : ""}
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:0 30px 20px;text-align:center;border-top:1px solid #EDEDF1;">
        <p style="margin:18px 0 4px;color:#8A8A94;font-size:12px;line-height:18px;">
          If you have any questions, please email us at
          <a href="mailto:info@viralon.in" style="color:#14121F;text-decoration:none;font-weight:600;">info@viralon.in</a>
        </p>
        <p style="margin:0 0 14px;color:#8A8A94;font-size:12px;line-height:18px;">
          Our team can answer anything about this enquiry, or talk you through what we would do next.
        </p>
        <div style="margin:0 0 4px;">${SOCIAL}</div>
      </td>
    </tr>

    <tr>
      <td align="center" style="padding:14px 24px 16px;background:#E8F4FF;border-radius:0 0 16px 16px;text-align:center;">
        <p style="margin:0 0 3px;font-size:12px;line-height:17px;">
          <a href="${SITE_URL}" style="color:#0088FF;text-decoration:none;font-weight:600;">Team Viralon &middot; viralon.in</a>
        </p>
        <p style="margin:0;color:#7C879B;font-size:11px;line-height:16px;">
          Sent because you asked us to get in touch. Reply to this mail to reach us directly.
        </p>
      </td>
    </tr>
  </table>

      </td>
    </tr>
  </table>
</div>`;
}

// "Google Meet on Thursday, 4 September 2026 at 4:30 PM IST", ready to drop
// into a sentence — plus the joining line that goes with the mode.
function meetingLines(lead) {
  const when = lead?.meetingDate
    ? `${prettyDate(lead.meetingDate)}${lead.meetingTime ? ` at ${prettyTime(lead.meetingTime)} IST` : ""}`
    : "";
  const mode = lead?.meetingMode || "";
  const headline = mode && when ? `<strong>${mode}</strong> on <strong>${when}</strong>` : `<strong>${when}</strong>`;

  let detail = "";
  if (mode === "Google Meet" && lead?.meetLink) {
    detail = `<p>Join here: <a href="${lead.meetLink}" style="color:${BRAND};">${lead.meetLink}</a></p>`;
  } else if (mode === "Google Meet") {
    detail = `<p>We'll send the joining link before we start.</p>`;
  } else if (mode === "Phone call") {
    detail = `<p>We'll ring you on ${lead?.phone || "your number"} — nothing to install.</p>`;
  } else if (mode === "In person" && lead?.meetingPlace) {
    detail = `<p>Where: ${lead.meetingPlace}</p>`;
  }
  return { when, mode, headline, detail };
}

/* Every template returns { subject, html }. `lead` is the Query document. */
export function buildLeadMail(template, lead) {
  const first = String(lead?.name || "there").trim().split(/\s+/)[0] || "there";
  const biz = lead?.businessName ? ` for <strong>${lead.businessName}</strong>` : "";
  const { when, headline, detail } = meetingLines(lead);

  switch (template) {
    /* ── Nothing fixed yet ──────────────────────────────────────────────── */
    case "invite":
      return {
        subject: "Thanks for reaching out — we'll call you shortly",
        html: shell(
          `<p>Hi ${first},</p>
           <p>Thanks for getting in touch with Viralon${biz}. Your enquiry is with our
              team and someone will call you on ${lead?.phone || "the number you gave us"}
              in the next working day.</p>
           <p>On that call we'll understand what you're running today, then fix a proper
              strategy session — over Google Meet, on the phone, or in person, whichever
              suits you.</p>
           <p>If there's a better time to reach you, just reply to this mail and we'll
              work around it.</p>`
        ),
      };

    case "invite2":
      return {
        subject: "Still keen? We'd like to get you on a call",
        html: shell(
          `<p>Hi ${first},</p>
           <p>We've tried reaching you about your enquiry${biz} and haven't managed to
              catch you yet.</p>
           <p>Reply with a day and time that works — morning, evening, weekend, whatever
              is easiest — and we'll call then. No cost, no obligation.</p>`
        ),
      };

    /* ── A meeting is on the calendar ───────────────────────────────────── */
    case "confirm":
      return {
        subject: "Your session with Viralon is confirmed",
        html: shell(
          `<p>Hi ${first},</p>
           <p>All set — we're meeting over ${headline}.</p>
           ${detail}
           <p>Nothing to prepare. Come with your questions and we'll do the rest.</p>`
        ),
      };

    case "d2":
      return {
        subject: `Your Viralon session is in 2 days — ${prettyDate(lead?.meetingDate)}`,
        html: shell(
          `<p>Hi ${first},</p>
           <p>A quick note that our session is set for ${headline}.</p>
           ${detail}
           <p>If that no longer works, reply here and we'll move it — no problem at all.</p>`
        ),
      };

    case "d1":
      return {
        subject: "Your Viralon session is tomorrow",
        html: shell(
          `<p>Hi ${first},</p>
           <p>See you tomorrow — ${headline}.</p>
           ${detail}`
        ),
      };

    case "h3":
      return {
        subject: "Your Viralon session is in 3 hours",
        html: shell(
          `<p>Hi ${first},</p>
           <p>We're on in about 3 hours — ${headline}.</p>
           ${detail}`
        ),
      };

    case "m45":
      return {
        subject: "Starting soon — your Viralon session",
        html: shell(
          `<p>Hi ${first},</p>
           <p>We're set for ${headline}, about 45 minutes from now.</p>
           ${detail}`
        ),
      };

    case "start":
      return {
        subject: "We're starting now — your Viralon session",
        html: shell(
          `<p>Hi ${first},</p>
           <p>We're on now — ${headline}.</p>
           ${detail}
           <p>If you need a minute, just reply and we'll wait.</p>`
        ),
      };

    case "reschedule":
      return {
        subject: "Your Viralon session has been moved",
        html: shell(
          `<p>Hi ${first},</p>
           <p>Your session has been updated — we're now meeting over ${headline}.</p>
           ${detail}
           <p>If that doesn't suit you, reply here and we'll find another time.</p>`
        ),
      };

    /* ── After the meeting ──────────────────────────────────────────────── */
    case "material":
      return {
        subject: "As promised — your Viralon pack",
        html: shell(
          `<p>Hi ${first},</p>
           <p>Great speaking with you. Here is the pack we talked about — what we would
              run${biz}, the case studies closest to your industry, and how we price.</p>
           <p>Have a read and tell us what you think. Any question is fair game.</p>`,
          { href: SITE_URL, label: "See our work" }
        ),
      };

    case "noshow":
      return {
        subject: "Sorry we missed you — shall we try again?",
        html: shell(
          `<p>Hi ${first},</p>
           <p>We were ready at ${when || "the agreed time"} but couldn't reach you.
              Things come up — happens to all of us.</p>
           <p>Reply with a time that suits you better and we'll set it up again.</p>`
        ),
      };

    case "recap":
      return {
        subject: `Recap and everything we promised${lead?.businessName ? `, ${lead.businessName}` : ""}`,
        html: shell(
          `<p>Hi ${first},</p>
           <p>Thank you for the time today. A quick recap of what we covered.</p>
           <p><strong>Where you are:</strong> [two lines on their current position]<br/>
              <strong>The three gaps costing you the most:</strong> [gap 1, gap 2, gap 3]<br/>
              <strong>What we would build first:</strong> [the first 90 days in one line]</p>
           <p>Everything about us in one place:<br/>
              Website: <a href="${SITE_URL}" style="color:${BRAND};">${SITE_URL}</a></p>
           <p>Anything I've mis-stated, tell me and I'll correct it before the proposal goes out.</p>`
        ),
      };

    /* ── proposal ───────────────────────────────────────────────────────── */
    case "proposal":
      return {
        subject: `Your proposal${biz ? ` for ${lead.businessName}` : ""}`,
        html: shell(
          `<p>Hi ${first},</p>
           <p>Here is the proposal we discussed${biz}. It covers the scope, what we
              do month by month, the numbers we're aiming at and the investment.</p>
           <p>Read it at your own pace. When you're ready, reply with your questions
              or we can walk through it together on a short call.</p>`,
          { href: SITE_URL, label: "See our work" }
        ),
      };

    /* ── follow up ──────────────────────────────────────────────────────── */
    case "follow1":
      return {
        subject: "Just checking in",
        html: shell(
          `<p>Hi ${first},</p>
           <p>Checking in on the proposal we sent${biz}. No pressure at all — I only
              want to know whether it's still on your desk or whether the timing has moved.</p>
           <p>A one-line reply is plenty.</p>`
        ),
      };

    case "follow2":
      return {
        subject: "One thing worth a second look",
        html: shell(
          `<p>Hi ${first},</p>
           <p>While you're deciding, one thing worth a second look: [the single
              biggest gap you found] is the piece costing you the most right now,
              and it's the first thing we'd fix.</p>
           <p>Happy to show you exactly how we'd do it for a business like yours.</p>`
        ),
      };

    case "follow3":
      return {
        subject: "Should anyone else be on this?",
        html: shell(
          `<p>Hi ${first},</p>
           <p>If someone else needs to sign off on this, I'm glad to run a short
              session for them so you're not left explaining our work second-hand.</p>
           <p>Send me their name and I'll set it up around their calendar.</p>`
        ),
      };

    /* ── negotiation ────────────────────────────────────────────────────── */
    case "objBudget":
      return {
        subject: "On the investment",
        html: shell(
          `<p>Hi ${first},</p>
           <p>Understood on the budget. Rather than cut the work thin across
              everything, we can start with the one channel that pays back fastest
              and widen it once the numbers are on the board.</p>
           <p>Tell me the figure you're comfortable with and I'll show you honestly
              what it does and doesn't buy.</p>`
        ),
      };

    case "objTiming":
      return {
        subject: "On the timing",
        html: shell(
          `<p>Hi ${first},</p>
           <p>Fair enough on the timing. The only thing I'd flag is that the
              groundwork — tracking, creative, landing pages — takes a few weeks
              before anything can run, so starting that now costs you nothing extra
              and saves the wait later.</p>
           <p>If you'd rather revisit in a month, say the word and I'll come back then.</p>`
        ),
      };

    case "discount":
      return {
        subject: "What I can do on the numbers",
        html: shell(
          `<p>Hi ${first},</p>
           <p>I've spoken to the team. Here's what I can do${biz}: [the offer, in one
              clear line], valid till [date].</p>
           <p>That's the honest edge of what works for both of us — beyond it we'd be
              cutting the work rather than the price.</p>`
        ),
      };

    case "fomo":
      return {
        subject: "Holding a slot for you",
        html: shell(
          `<p>Hi ${first},</p>
           <p>We take on a limited number of accounts each month so the work stays
              proper, and we're close to full for this cycle.</p>
           <p>I've kept a slot aside${biz}. If you'd like it, tell me by [date] and
              we'll start; if not, no hard feelings and we'll pick it up next quarter.</p>`
        ),
      };

    default:
      return null;
  }
}

/* Awaited by the caller — the team needs to know the mail actually left. */
export function sendLeadMail({ to, cc, subject, html, attachments }) {
  if (!to) return Promise.reject(new Error("No email address on this lead"));
  const transporter = mailTransport();
  return transporter.sendMail({
    from: `"Viralon" <${MAIL_USER}>`, to, ...(cc ? { cc } : {}), subject, html,
    ...(attachments && attachments.length ? { attachments } : {}),
  });
}
