import nodemailer from "nodemailer";

export async function sendInvoiceEmail({ to, subject, htmlBody, pdfBuffer }) {
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 587,
    secure: false,
    auth: {
      user: "info@viralon.in",
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: `"Viralon Sales" <info@viralon.in>`,
    to,
    subject,
    html: htmlBody,
    attachments: [
      {
        filename: "Recurring-Invoice.pdf",
        content: pdfBuffer,
      },
    ],
  });
}
