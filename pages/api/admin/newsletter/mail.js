// pages/api/admin/newsletter/mail.js — the compose box behind
// Website → Newsletter. GET hands back the draft and how many people are on
// the list; POST sends what the user wrote, one personal copy per address.
//
// Only subscribed addresses are ever mailed — an unsubscribed row cannot be
// reached even if its address is passed in by hand.
import dbConnect from "@/utils/dbConnect";
import Newsletter from "@/models/Newsletter";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { newsletterDraft, sendNewsletterMail } from "@/utils/newsletterMail";

// One request sends at most this many, so a big list cannot run past the
// serverless time limit halfway through. Send the rest in a second pass.
const MAX_PER_SEND = 300;

// Files ride along inside the request as base64, so the body has to be allowed
// to grow; anything past this is a download link, not an attachment.
const MAX_FILES = 5;
const MAX_BYTES = 8 * 1024 * 1024;

export const config = { api: { bodyParser: { sizeLimit: "14mb" } } };

const str = (v) => String(v ?? "").trim();
const isEmail = (v) => /^\S+@\S+\.\S+$/.test(v);

/* What the compose box sent up, turned into what nodemailer wants. */
function readAttachments(input) {
  const list = Array.isArray(input) ? input.slice(0, MAX_FILES) : [];
  let bytes = 0;
  const out = list.map((a) => {
    const content = Buffer.from(String(a?.data || "").split(",").pop() || "", "base64");
    bytes += content.length;
    return {
      filename: str(a?.filename).replace(/[\r\n"]/g, "") || "attachment",
      content,
      ...(str(a?.type) ? { contentType: str(a.type) } : {}),
    };
  }).filter((a) => a.content.length);

  if (bytes > MAX_BYTES) {
    const e = new Error("The files add up to more than 8 MB — send a link instead");
    e.tooBig = true;
    throw e;
  }
  return out;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const subscribed = await Newsletter.countDocuments({ status: "subscribed" });
      return res.status(200).json({ success: true, draft: newsletterDraft(), subscribed });
    }

    if (req.method !== "POST") {
      return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    const subject = str(req.body?.subject);
    const body = str(req.body?.body);
    if (!subject) return res.status(400).json({ success: false, message: "Give the mail a subject" });
    if (!body) return res.status(400).json({ success: false, message: "The mail has no message in it" });

    let attachments;
    try {
      attachments = readAttachments(req.body?.attachments);
    } catch (e) {
      return res.status(400).json({ success: false, message: e.message });
    }

    /* ── A test copy: goes to one address, on or off the list ──────────── */
    const testTo = str(req.body?.testTo).toLowerCase();
    if (testTo) {
      if (!isEmail(testTo)) return res.status(400).json({ success: false, message: "That test address is not valid" });
      await sendNewsletterMail({ to: testTo, subject, body, attachments });
      return res.status(200).json({ success: true, test: true, sent: 1 });
    }

    /* ── The real send ─────────────────────────────────────────────────── */
    const picked = Array.isArray(req.body?.emails)
      ? req.body.emails.map((e) => str(e).toLowerCase()).filter(isEmail)
      : [];

    const rows = await Newsletter.find({
      status: "subscribed",
      ...(picked.length ? { email: { $in: picked } } : {}),
    })
      .select("email")
      .lean();

    const list = rows.map((r) => r.email);
    if (!list.length) {
      return res.status(400).json({
        success: false,
        message: picked.length === 1
          ? "That address has unsubscribed, so no mail can go to it"
          : "Nobody on the list to send this to",
      });
    }

    const batch = list.slice(0, MAX_PER_SEND);
    let sent = 0;
    const failed = [];

    // One at a time: a personal unsubscribe link per copy, and one bad address
    // does not take the rest of the send down with it.
    for (const to of batch) {
      try {
        await sendNewsletterMail({ to, subject, body, attachments });
        sent += 1;
      } catch (e) {
        failed.push(to);
        console.error("newsletter mail:", to, e?.message);
      }
    }

    return res.status(200).json({
      success: true,
      sent,
      failed: failed.length,
      skipped: list.length - batch.length,
    });
  } catch (error) {
    console.error("newsletter mail:", error?.message);
    return res.status(500).json({ success: false, message: error?.message || "The mail did not go out" });
  }
}
