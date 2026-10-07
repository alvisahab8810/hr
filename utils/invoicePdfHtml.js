// utils/invoicePdfHtml.js — the invoice PDF, rendered from the same HTML the
// screen shows.
//
// The attachment used to be drawn a second time with jsPDF, which meant the
// sheet a client received never quite matched the one the sender had just
// previewed. This renders components/invoiceSheet.js through the headless
// Chrome that is already a dependency here (the salary slips use it), so there
// is one design and one place to change it.
//
// The artwork is read off disk and inlined as data URIs: a headless render has
// no site to fetch /assets from, and a request that cannot resolve would hold
// the mail up.
import fs from "fs";
import path from "path";
import { invoiceHtml, INVOICE_CSS, INVOICE_FONTS } from "@/components/invoiceSheet";

const ART = path.join(process.cwd(), "public", "assets", "images");
const FONTS = path.join(process.cwd(), "public", "assets", "fonts");

// Chrome is handed the typeface as bytes: a headless render has no site to
// fetch it from, and a face that never arrives would quietly reset the sheet
// to whatever the box happens to have installed.
function cssWithFont() {
  let css = INVOICE_CSS;
  for (const url of Object.values(INVOICE_FONTS)) {
    try {
      const woff = fs.readFileSync(path.join(FONTS, path.basename(url)));
      css = css.replace(url, `data:font/woff2;base64,${woff.toString("base64")}`);
    } catch {
      // A face that cannot be read is left pointing at its URL: the sheet
      // still prints, in whatever the renderer falls back to.
    }
  }
  return css;
}

const dataUri = (file) => {
  try {
    const svg = fs.readFileSync(path.join(ART, file), "utf8");
    return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
  } catch {
    // Missing artwork must not cost us the invoice; the sheet simply prints
    // without it.
    return "";
  }
};

export function invoiceSheetDocument(inv, { company, terms } = {}) {
  const body = invoiceHtml(inv, {
    company,
    terms,
    assets: { mark: dataUri("viralon-mark.svg"), sign: dataUri("signature.svg"), qr: dataUri("qr.svg") },
  });
  return `<!doctype html><html><head><meta charset="utf-8"/>` +
    `<style>html,body{margin:0;padding:0;background:#fff}${cssWithFont()}</style>` +
    `</head><body>${body}</body></html>`;
}

// puppeteer ships with its own Chrome, but only once `puppeteer browsers
// install chrome` has been run on the box -- which is not something a deploy
// does by itself. Where that is missing we try the Chrome the machine already
// has before giving up, and PUPPETEER_EXECUTABLE_PATH overrides both.
async function openBrowser(puppeteer) {
  const base = { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] };
  try {
    return await puppeteer.launch(base);
  } catch (e) {
    return puppeteer.launch({ ...base, channel: "chrome" });
  }
}

export async function invoiceHtmlPdf(inv, opts = {}) {
  const puppeteer = (await import("puppeteer")).default;
  const browser = await openBrowser(puppeteer);
  try {
    const page = await browser.newPage();
    // The markup carries no external request, so there is nothing to wait for
    // on the network and "load" is enough.
    await page.setContent(invoiceSheetDocument(inv, opts), { waitUntil: "load" });
    const buf = await page.pdf({
      format: "A4",
      printBackground: true,
      // The sheet owns its own 46px margin and bleeds the terms band to the
      // paper edge, so the page must add none of its own.
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return Buffer.from(buf);
  } finally {
    await browser.close().catch(() => {});
  }
}
