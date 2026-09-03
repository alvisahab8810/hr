// utils/mailer.js — the one mail transport for the whole project.
// Google Workspace SMTP with an app password. Everything that sends mail —
// payroll, the CRM, task notifications, invites — goes through here, so the
// mailbox is changed in one place.
import nodemailer from "nodemailer";

export const MAIL_USER = process.env.EMAIL_USER || "info@viralon.in";
export const MAIL_NAME = process.env.EMAIL_FROM_NAME || "Viralon";
export const MAIL_FROM = `"${MAIL_NAME}" <${MAIL_USER}>`;

export function mailTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || 465),
    secure: String(process.env.EMAIL_SECURE || "true") === "true",
    auth: { user: MAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

export default mailTransport;
