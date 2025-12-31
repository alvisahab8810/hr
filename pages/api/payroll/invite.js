import nodemailer from "nodemailer";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/payroll/Employee"; // adjust the path as needed

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email, employeeId } = req.body;

  if (!email || !employeeId) {
    return res.status(400).json({ success: false, message: "Missing data" });
  }

  await dbConnect();

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return res.status(404).json({ success: false, message: "Employee not found" });
  }

  // ✅ Define baseUrl with fallback to localhost
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const loginLink = `${baseUrl}/employee/login?email=${encodeURIComponent(email)}`;

  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 587,
    secure: false,
    auth: {
      user: "info@viralon.in",
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const htmlBody = `
    <div style="font-family: sans-serif;">
      <h2>Hello ${employee.firstName},</h2>
      <p>You’ve been invited to access your Payroll profile at <strong>Viralon</strong>.</p>
      <p>Click the button below to login:</p>
      <a href="${loginLink}" style="display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;">
        Login to Payroll
      </a>
      <p style="margin-top:20px;font-size:0.9em;">If you didn’t request this, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Viralon HR" <info@viralon.in>`,
    to: email,
    subject: "You’re invited to access your Payroll account",
    html: htmlBody,
  });

  res.status(200).json({ success: true });
}
