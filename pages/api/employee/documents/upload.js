// pages/api/employee/documents/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export const config = { api: { bodyParser: false } };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const empId = req.user.employeeId;
    const dir   = path.join(process.cwd(), "public", "uploads", empId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const base = file.fieldname;
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ok = ["image/jpeg","image/jpg","image/png","application/pdf"].includes(file.mimetype);
  cb(ok ? null : new Error("Only JPG, PNG, PDF allowed"), ok);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

const uploadFields = upload.fields([
  { name: "appointmentLetter", maxCount: 1 },
  { name: "salarySlips",       maxCount: 10 },
  { name: "relievingLetter",   maxCount: 1 },
  { name: "experienceLetter",  maxCount: 1 },
]);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ success: false, message: "Method not allowed" });
    return;
  }

  try {
    // Auth
    const authHeader = req.headers.authorization || "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, employeeId: payload.employeeId };

    await dbConnect();
    await runMiddleware(req, res, uploadFields);

    const emp = await Employee.findById(req.user.id);
    if (!emp) { res.status(404).json({ success: false, message: "Employee not found" }); return; }

    const files     = req.files || {};
    const baseUrl   = `/uploads/${req.user.employeeId}/`;
    const f  = (name) => files[name]?.[0] ? baseUrl + files[name][0].filename : undefined;
    const multi = (name) => (files[name] || []).map((x) => baseUrl + x.filename);

    // Merge with existing docs — don't overwrite if nothing uploaded for that field
    const existing = emp.documents || {};

    emp.documents = {
      appointmentLetter: f("appointmentLetter") || existing.appointmentLetter,
      relievingLetter:   f("relievingLetter")   || existing.relievingLetter,
      experienceLetter:  f("experienceLetter")   || existing.experienceLetter,
      // For salary slips: append new ones to existing
      salarySlips: [
        ...(existing.salarySlips || []),
        ...multi("salarySlips"),
      ],
    };

    await emp.save();

    res.status(200).json({ success: true, documents: emp.documents });
  } catch (err) {
    console.error("Document upload error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
  }
}