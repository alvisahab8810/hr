

// import dbConnect from "../../../utils/dbConnect";
// import recurringInvoice from "../../../models/sales/recurringInvoice";
// import { sendInvoiceEmail } from "../../../utils/emailSender";
// import { createInvoiceAndPDF } from "../../../utils/invoiceGenerator";

// const getNextInvoiceDate = (startDate, recurringType, repeatEvery) => {
//   const date = new Date(startDate);
//   switch (recurringType) {
//     case "daily":
//       date.setDate(date.getDate() + repeatEvery);
//       break;
//     case "weekly":
//       date.setDate(date.getDate() + 7 * repeatEvery);
//       break;
//     case "monthly":
//       date.setMonth(date.getMonth() + repeatEvery);
//       break;
//     case "yearly":
//       date.setFullYear(date.getFullYear() + repeatEvery);
//       break;
//   }
//   return date;
// };

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end("Only GET allowed");

//   await dbConnect();

//   const today = new Date();
//   today.setHours(0, 0, 0, 0);

//   const recurringInvoices = await recurringInvoice.find({ recurringType: { $ne: null } });

//   const processed = [];

//   for (const invoice of recurringInvoices) {
//     const { endDate, recurringType, repeatEvery, invoiceDate, customerId } = invoice;
//     if (!recurringType || !repeatEvery || !invoiceDate) continue;

//     const lastDate = new Date(invoiceDate);
//     const nextDate = getNextInvoiceDate(lastDate, recurringType, repeatEvery);
//     nextDate.setHours(0, 0, 0, 0);

//     console.log("-------------------------------------------------");
//     console.log("Invoice Number:", invoice.invoiceNumber);
//     console.log("Last Invoice Date:", lastDate.toDateString());
//     console.log("Expected Next Date:", nextDate.toDateString());
//     console.log("Today's Date:", today.toDateString());

//     if (nextDate.toDateString() === today.toDateString()) {
//       const newInvoiceData = {
//         customerId,
//         invoiceNumber: `INV-${Math.floor(Math.random() * 100000)}`,
//         invoiceDate: nextDate,
//         dueDate: invoice.dueDate,
//         referenceNumber: invoice.referenceNumber,
//         subject: invoice.subject,
//         items: invoice.items,
//         subtotal: invoice.subtotal,
//         discount: invoice.discount,
//         gst: invoice.gst,
//         adjustment: invoice.adjustment,
//         total: invoice.total,
//         customerNotes: invoice.customerNotes,
//         terms: invoice.terms,
//         customerEmail: invoice.customerEmail,
//         sacCode: invoice.sacCode,
//         previewHTML: invoice.previewHTML,
//       };

//       const { pdfBuffer, invoiceRecord } = await createInvoiceAndPDF(newInvoiceData);

//       // ✅ Only send email if email is valid
//       if (invoice.customerEmail && invoice.customerEmail.includes("@")) {
//         await sendInvoiceEmail({
//           to: invoice.customerEmail,
//           subject: `Recurring Invoice #${newInvoiceData.invoiceNumber}`,
//           htmlBody: `<p>Please find attached your recurring invoice.</p>`,
//           pdfBuffer,
//         });
//       } else {
//         console.warn(`⚠️ Skipping email. Invalid or missing email for invoice: ${invoice.invoiceNumber}`);
//       }

//       // Update original invoice's invoiceDate
//       invoice.invoiceDate = nextDate;
//       await invoice.save();

//       processed.push(invoiceRecord.invoiceNumber);
//       console.log("✅ Recurring invoice generated:", invoiceRecord.invoiceNumber);
//     } else {
//       console.log("ℹ️ Not due today, skipping.");
//     }
//   }

//   res.status(200).json({ success: true, processed });
// }








// /pages/api/cron/processRecurringInvoices.js

import dbConnect from "../../../utils/dbConnect";
import RecurringInvoice from "../../../models/sales/recurringInvoice";
import { sendInvoiceEmail } from "../../../utils/emailSender";
import { createInvoiceAndPDF } from "../../../utils/invoiceGenerator";

const getNextInvoiceDate = (startDate, recurringType, repeatEvery) => {
  const date = new Date(startDate);
  switch (recurringType) {
    case "daily":
      date.setDate(date.getDate() + repeatEvery);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7 * repeatEvery);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + repeatEvery);
      break;
    case "yearly":
      date.setFullYear(date.getFullYear() + repeatEvery);
      break;
  }
  return date;
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end("Only GET allowed");

  await dbConnect();

  const today = new Date();
  today.setHours(0, 0, 0, 0); // Ignore time, match by date only

  const recurringInvoices = await RecurringInvoice.find({
    recurringType: { $ne: null },
  });

  const processed = [];

  for (const invoice of recurringInvoices) {
    const { invoiceDate, recurringType, repeatEvery, endDate } = invoice;
    if (!invoiceDate || !recurringType || !repeatEvery) continue;

    const lastDate = new Date(invoiceDate);
    const nextDate = getNextInvoiceDate(lastDate, recurringType, repeatEvery);
    nextDate.setHours(0, 0, 0, 0);

    console.log("-------------------------------------------------");
    console.log("Invoice Number:", invoice.invoiceNumber);
    console.log("Last Invoice Date:", lastDate.toDateString());
    console.log("Expected Next Date:", nextDate.toDateString());
    console.log("Today's Date:", today.toDateString());

    // ⛔ Stop if invoice expired
    if (endDate && new Date(endDate) < today) {
      console.log("❌ Recurring period ended, skipping.");
      continue;
    }

    // ✅ Due today?
    if (nextDate.toDateString() === today.toDateString()) {
      const newInvoiceNumber = `INV-${Math.floor(Math.random() * 100000)}`;

      const newInvoiceData = {
        customerId: invoice.customerId,
        invoiceNumber: newInvoiceNumber,
        invoiceDate: nextDate,
        dueDate: invoice.dueDate,
        referenceNumber: invoice.referenceNumber,
        subject: invoice.subject,
        items: invoice.items,
        subtotal: invoice.subtotal,
        discount: invoice.discount,
        gst: invoice.gst,
        adjustment: invoice.adjustment,
        total: invoice.total,
        customerNotes: invoice.customerNotes,
        terms: invoice.terms,
        customerEmail: invoice.customerEmail,
        sacCode: invoice.sacCode,
        previewHTML: invoice.previewHTML,
      };

      try {
        const { pdfBuffer, invoiceRecord } = await createInvoiceAndPDF(newInvoiceData);

        if (invoice.customerEmail && invoice.customerEmail.includes("@")) {
          await sendInvoiceEmail({
            to: invoice.customerEmail,
            subject: `Recurring Invoice #${newInvoiceNumber}`,
            htmlBody: `<p>Please find attached your recurring invoice.</p>`,
            pdfBuffer,
          });

          console.log(`📧 Email sent to: ${invoice.customerEmail}`);
        } else {
          console.warn(`⚠️ Invalid or missing email for invoice: ${invoice.invoiceNumber}`);
        }

        // Update last sent date to today
        invoice.invoiceDate = nextDate;
        await invoice.save();

        processed.push(invoiceRecord.invoiceNumber);
        console.log("✅ Recurring invoice generated:", invoiceRecord.invoiceNumber);
      } catch (err) {
        console.error("❌ Error creating or sending invoice:", err);
      }
    } else {
      console.log("ℹ️ Not due today, skipping.");
    }
  }

  res.status(200).json({ success: true, processed });
}
