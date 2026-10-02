// utils/mailFiles.js — files the team picked in a compose box, turned into
// nodemailer attachments. They arrive as base64 in the request body, so
// nothing is written to disk and no upload route is needed.
//
// An HTML file never goes out as HTML: mail clients show it as raw code, and
// most of them flag or strip it. A page the team wants a client to read is
// printed to PDF here instead, so what lands in the inbox is what they meant
// to send.
import puppeteer from "puppeteer";

const MAX_TOTAL = 12 * 1024 * 1024; // what Gmail will carry comfortably

const isHtml = (f) =>
  /html/i.test(String(f?.type || "")) || /\.x?html?$/i.test(String(f?.name || ""));

/* One browser for the whole batch — launching it is the expensive part. */
async function htmlToPdf(pages) {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  try {
    const out = [];
    for (const html of pages) {
      const page = await browser.newPage();
      // The page may pull in fonts and images; give it a moment, but never
      // let one slow asset hold up a mail.
      await page.setContent(html, { waitUntil: "networkidle0", timeout: 20000 }).catch(async () => {
        await page.setContent(html, { waitUntil: "domcontentloaded" });
      });
      out.push(await page.pdf({ format: "A4", printBackground: true }));
      await page.close();
    }
    return out;
  } finally {
    await browser.close().catch(() => {});
  }
}

export default async function mailFiles(list) {
  if (!Array.isArray(list) || !list.length) return [];

  const rows = [];
  for (const f of list) {
    const data = String(f?.data || "");
    if (!data) continue;
    rows.push({ f, content: Buffer.from(data, "base64") });
  }
  if (!rows.length) return [];

  // The size cap is checked on what was picked, before anything is converted.
  const total = rows.reduce((n, r) => n + r.content.length, 0);
  if (total > MAX_TOTAL) throw new Error("Those files add up to more than 12 MB — remove one and try again");

  const html = rows.filter((r) => isHtml(r.f));
  let pdfs = [];
  if (html.length) {
    try {
      pdfs = await htmlToPdf(html.map((r) => r.content.toString("utf8")));
    } catch {
      throw new Error("That HTML file could not be turned into a PDF. Save it as a PDF and attach that instead.");
    }
  }

  let at = 0;
  return rows.map((r) => {
    const name = String(r.f.name || "attachment").slice(0, 120);
    if (isHtml(r.f)) {
      return {
        filename: `${name.replace(/\.x?html?$/i, "")}.pdf`,
        content: pdfs[at++],
        contentType: "application/pdf",
      };
    }
    return {
      filename: name,
      content: r.content,
      ...(r.f.type ? { contentType: String(r.f.type) } : {}),
    };
  });
}
