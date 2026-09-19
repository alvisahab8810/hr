// utils/newsletterToken.js — the signature on an unsubscribe link.
//
// IMPORTANT: keep this identical to viralon-new/utils/newsletterToken.js. HQ
// signs the link that goes out in a newsletter mail and the website verifies
// it, so both sides must hash the address with the same secret — set
// NEWSLETTER_SECRET to the same value in both .env files.
import crypto from "crypto";

const SECRET =
  process.env.NEWSLETTER_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "viralon_newsletter_2026";

export function signEmail(email) {
  return crypto
    .createHmac("sha256", SECRET)
    .update(String(email || "").trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

export function verifyEmail(email, token) {
  const expected = signEmail(email);
  const given = String(token || "");
  if (given.length !== expected.length) return false;
  // Constant time, so a wrong token can't be guessed a character at a time.
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}
