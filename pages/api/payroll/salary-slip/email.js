// import nodemailer from "nodemailer";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

//   const { email, pdfUrl } = req.body;

//   if (!email || !pdfUrl) {
//     return res.status(400).json({ message: "Email and PDF URL are required" });
//   }

//   try {
//     const transporter = nodemailer.createTransport({
//       host: "smtp.hostinger.com",
//       port: 587,
//       secure: false,
//       auth: {
//         user: "info@viralon.in", // same as invite email
//         pass: process.env.EMAIL_PASS, // your Hostinger SMTP password
//       },
//       tls: {
//         rejectUnauthorized: false,
//       },
//     });

//     const htmlBody = `
//       <div style="font-family: sans-serif; line-height: 1.6;">
//         <h2>Your Salary Slip is Ready</h2>
//         <p>Dear Employee,</p>
//         <p>Please find attached your salary slip. If you have any queries, contact HR.</p>
//         <p style="margin-top: 20px;">Best Regards,<br><strong>Viralon HR Team</strong></p>
//       </div>
//     `;

//     await transporter.sendMail({
//       from: `"Viralon HR" <info@viralon.in>`,
//       to: email,
//       subject: "Your Salary Slip",
//       html: htmlBody,
//       attachments: [
//         {
//           filename: "SalarySlip.pdf",
//           path: pdfUrl, // full URL or local path
//         },
//       ],
//     });

//     return res.status(200).json({ success: true, message: "Email sent successfully" });
//   } catch (error) {
//     console.error("Email error:", error);
//     return res.status(500).json({ message: "Failed to send email" });
//   }
// }





import nodemailer from "nodemailer";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ message: "Method not allowed" });

  const { email, pdfUrl } = req.body;

  if (!email || !pdfUrl) {
    return res
      .status(400)
      .json({ message: "Email and PDF URL are required" });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false,
      auth: {
        user: "info@viralon.in", // ✅ Your Hostinger SMTP email
        pass: process.env.EMAIL_PASS, // ✅ Hostinger SMTP password
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // ✅ Convert the relative URL to an absolute path in the "public" folder
    const pdfPath = path.join(process.cwd(), "public", pdfUrl);

    const htmlBody = `
      <div style="font-family: sans-serif; line-height: 1.6;">
        <h2>Your Salary Slip is Ready</h2>
        <p>Dear Employee,</p>
        <p>Please find attached your salary slip. If you have any queries, contact HR.</p>
        <p style="margin-top: 20px;">Best Regards,<br><strong>Viralon HR Team</strong></p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Viralon HR" <info@viralon.in>`,
      to: email,
      subject: "Your Salary Slip",
      html: htmlBody,
      attachments: [
        {
          filename: "SalarySlip.pdf",
          path: pdfPath, // ✅ Correct local file path
        },
      ],
    });

    return res
      .status(200)
      .json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ message: "Failed to send email" });
  }
}
