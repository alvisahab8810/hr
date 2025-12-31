// import Invoice from "../models/sales/Invoice";
// import puppeteer from "puppeteer";

// export async function createInvoiceAndPDF(data) {
//   const newInvoice = new Invoice(data);
//   await newInvoice.save();

//   const browser = await puppeteer.launch({
//     args: ["--no-sandbox", "--disable-setuid-sandbox"],
//     headless: true,
//   });
//   const page = await browser.newPage();
//   await page.setContent(data.previewHTML);
//   const pdfBuffer = await page.pdf({ format: "A4" });
//   await browser.close();

//   return { pdfBuffer, invoiceRecord: newInvoice };
// }



// utils/invoiceGenerator.js

import Invoice from "../models/sales/Invoice";
import puppeteer from "puppeteer";

export async function createInvoiceAndPDF(data, options = { saveToDB: true }) {
  let invoiceRecord = null;

  if (options.saveToDB) {
    invoiceRecord = new Invoice(data);
    await invoiceRecord.save();
  }

  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(data.previewHTML);
  const pdfBuffer = await page.pdf({ format: "A4" });
  await browser.close();

  return { pdfBuffer, invoiceRecord };
}
