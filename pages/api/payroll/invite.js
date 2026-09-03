import { mailTransport, MAIL_FROM, MAIL_USER } from "@/utils/mailer";
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

  const transporter = mailTransport();

  const htmlBody = `
    <div style="font-family: sans-serif;">
      <h2>Hello ${employee.firstName},</h2>
      <p>You’ve been invited to access <strong>Viralon HQ</strong>.</p>
      <p>Click the button below to login:</p>
      <a href="${loginLink}" style="display:inline-block;padding:10px 20px;background:#007bff;color:white;text-decoration:none;border-radius:5px;">
        Login to Viralon HQ
      </a>
      <p style="margin-top:20px;font-size:0.9em;">If you didn’t request this, please ignore this email.</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Viralon HR" <${MAIL_USER}>`,
    to: email,
    subject: "You’re invited to access Viralon HQ",
    html: htmlBody,
  });

  res.status(200).json({ success: true });
}
