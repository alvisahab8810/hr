// utils/leadMail.js — the mails the Leads board sends to a lead.
// The website books nothing: someone from the team rings the lead, agrees how
// and when to meet, and writes it on the lead. These mails follow that — a
// "we'll call you" note while nothing is fixed, then a confirmation and the
// reminder ladder once a meeting is on the calendar.
import nodemailer from "nodemailer";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://viralon.in";

// Brand colours from the website (public/assets/css/style.css) — these mails go
// to leads, so they read as viralon.in, not as the payroll dashboard.
const BRAND = "#5138ee";
const INK = "#04000b";

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

function shell(bodyHtml, cta) {
  return `
  <div style="margin:0;padding:28px 12px;background:#F4F4F9;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #ECECF5;">
      <div style="background:${BRAND};padding:20px 26px;">
        <div style="color:#fff;font-size:19px;font-weight:800;letter-spacing:-.3px;">Viralon</div>
      </div>
      <div style="padding:26px;color:${INK};font-size:15px;line-height:1.65;">
        ${bodyHtml}
        ${cta ? `<div style="margin:26px 0 6px;">
          <a href="${cta.href}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;
             padding:13px 26px;border-radius:8px;font-weight:700;font-size:15px;">${cta.label}</a>
        </div>` : ""}
      </div>
      <div style="padding:16px 26px;background:#FAFAFD;border-top:1px solid #F1F1F8;color:#8A8AA3;font-size:12px;line-height:1.6;">
        Team Viralon · <a href="${SITE_URL}" style="color:${BRAND};text-decoration:none;">viralon.in</a><br/>
        Sent because you asked us to get in touch. Reply to this mail to reach us directly.
      </div>
    </div>
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
export function sendLeadMail({ to, cc, subject, html }) {
  if (!to) return Promise.reject(new Error("No email address on this lead"));
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 465,
    secure: true,
    auth: { user: "info@viralon.in", pass: process.env.EMAIL_PASS },
  });
  return transporter.sendMail({ from: '"Viralon" <info@viralon.in>', to, ...(cc ? { cc } : {}), subject, html });
}
