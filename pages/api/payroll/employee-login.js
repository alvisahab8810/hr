// pages/api/payroll/employee-login.js
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/payroll/Employee"; // adjust path if needed
import jwt from "jsonwebtoken";
import cookie from "cookie";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email is required" });

  await dbConnect();

  const employee = await Employee.findOne({ email });
  if (!employee) return res.status(401).json({ success: false, message: "Employee not found" });

  const token = jwt.sign(
    { id: employee._id, email: employee.email, role: "employee" },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.setHeader("Set-Cookie", cookie.serialize("employee_auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  }));

  return res.status(200).json({ success: true });
}
