import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

// Disable Next.js body parsing (multer handles it)
export const config = { api: { bodyParser: false } };

// Storage: /public/uploads/<employeeId>/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const empId = req.user.employeeId;
    const dir = path.join(process.cwd(), "public", "uploads", empId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = file.fieldname;
    const unique = Date.now();
    cb(null, `${base}-${unique}${ext}`);
  },
});

// Accept only jpeg/pdf
const fileFilter = (_req, file, cb) => {
  const ok = ["image/jpeg", "image/jpg", "application/pdf"].includes(file.mimetype);
  cb(ok ? null : new Error("Only JPEG and PDF allowed"), ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// File fields
const uploadFields = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "appointmentLetter", maxCount: 1 },
  { name: "salarySlips", maxCount: 10 },
  { name: "relievingLetter", maxCount: 1 },
  { name: "experienceLetter", maxCount: 1 },
]);

// Middleware wrapper for multer
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

// Auth middleware
function authenticate(req, res) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const payload = authenticate(req, res);
    if (!payload) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    req.user = { id: payload.id, employeeId: payload.employeeId };

    await dbConnect();
    await runMiddleware(req, res, uploadFields);

    const emp = await Employee.findById(req.user.id);
    if (!emp) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Extract body fields
    const {
      firstName, lastName, mobile, email, fatherName, motherName,
      dob, maritalStatus, address, city, state, zip,
      employeeId, dateOfJoining, officialEmail, department, designation,
      monthlySalary, annualSalary, accountHolderName, bankName, branch,
      accountNumber, ifscCode, panNumber, upiId, employeeType, status,
    } = req.body;

    // File URLs,
    const basePublic = `/uploads/${req.user.employeeId}/`;
    const files = req.files || {};
    const f = (name) => files[name]?.[0] ? basePublic + files[name][0].filename : undefined;
    const multi = (name) => (files[name] || []).map((x) => basePublic + x.filename);

    // Save employee
    emp.personal = {
      firstName, lastName, mobile, email, fatherName, motherName,
      dob: dob ? new Date(dob) : undefined,
      maritalStatus, address, city, state, zip,
      avatar: f("avatar"),
    };

    emp.professional = {
      employeeId: employeeId || emp.employeeId,
      dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : undefined,
      officialEmail, department, designation, employeeType, status, 
    };

    emp.salary = {
      monthlySalary: monthlySalary ? Number(monthlySalary) : undefined,
      annualSalary: annualSalary ? Number(annualSalary) : undefined,
      accountHolderName, bankName, branch, accountNumber, ifscCode, panNumber, upiId,
    };

    emp.documents = {
      appointmentLetter: f("appointmentLetter"),
      salarySlips: multi("salarySlips"),
      relievingLetter: f("relievingLetter"),
      experienceLetter: f("experienceLetter"),
    };

    emp.hasCompletedProfile = true;
    await emp.save();

    return res.status(200).json({ success: true, redirectUrl: "/employee/profile" });
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}
