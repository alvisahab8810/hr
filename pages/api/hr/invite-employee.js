import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // const { firstName, lastName, email, employeeId, password } = req.body;

  const {
  firstName,
  lastName,
  email,
  employeeId,
  password,
  monthlySalary,
  annualSalary,
   // 🔽 NEW
  dateOfJoining,
  department,
  designation,
  employeeType,
  status,
} = req.body;


  if (!firstName || !lastName || !email || !employeeId || !password) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  await dbConnect();

  // hash password before saving
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
  const employee = new Employee({
  firstName,
  lastName,
  email,
  employeeId,
  password: hashedPassword,

  personal: {
    firstName,
    lastName,
    email: "",
  },

  professional: {
    employeeId,
    dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : new Date(),
    officialEmail: email,
    department,
    designation,
    employeeType,
    status,
  },

  salary: {
    monthlySalary: Number(monthlySalary),
    annualSalary: Number(annualSalary),
  },
});


if (!monthlySalary || !annualSalary) {
  return res
    .status(400)
    .json({ success: false, message: "Salary is required" });
}


    await employee.save();

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const loginLink = `${baseUrl}/employee/login`;

    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 587,
      secure: false,
      auth: {
        user: "info@viralon.in", // your sender
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: false },
    });

  const htmlBody = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background: #4a6cf7; padding: 20px; text-align: center;">
        <h2 style="color: white; margin: 0;">Viralon HR</h2>
      </div>
      <div style="padding: 20px;">
        <p>Hello <strong>${firstName} ${lastName}</strong>,</p>
        <p>You’ve been invited to access your <strong>Payroll profile</strong> at <strong>Viralon</strong>.</p>

        <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Employee ID</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${employeeId}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border: 1px solid #ddd;"><strong>Password</strong></td>
            <td style="padding: 8px; border: 1px solid #ddd;">${password}</td>
          </tr>
        </table>

        <p style="margin: 20px 0;">
          <a href="${loginLink}" 
             style="display:inline-block;padding:12px 24px;background:#4a6cf7;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
            Login to Payroll
          </a>
        </p>

        <p style="font-size: 0.9em; color: #555;">
          If you didn’t request this, please ignore this email.
        </p>
      </div>
      <div style="background: #f9f9f9; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        © ${new Date().getFullYear()} Viralon HR · All rights reserved
      </div>
    </div>
  </div>
`;


    await transporter.sendMail({
      from: `"Viralon HR" <info@viralon.in>`,
      to: email,
      subject: "You’re invited to access your Payroll account",
      html: htmlBody,
    });

    return res.status(201).json({ success: true, message: "Employee invited successfully" });
  } catch (err) {
    console.error("Error creating employee:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
