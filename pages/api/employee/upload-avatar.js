import multer from "multer";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export const config = { api: { bodyParser: false } };

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const empId = req.user?.employeeId;
    const dir = path.join(process.cwd(), "public", "uploads", empId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, _file, cb) => {
    cb(null, `avatar-${Date.now()}.jpg`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only image files allowed"), ok);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("avatar");

function authenticate(req) {
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) =>
    fn(req, res, (err) => (err instanceof Error ? reject(err) : resolve()))
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const user = authenticate(req);
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized" });
    req.user = user;

    await runMiddleware(req, res, upload);
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });

    await dbConnect();
    const emp = await Employee.findById(user.id || user._id);
    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });

    const avatarUrl = `/uploads/${user.employeeId}/${req.file.filename}`;
    if (!emp.personal) emp.personal = {};
    emp.personal.avatar = avatarUrl;
    emp.markModified("personal");
    await emp.save();

    return res.json({ success: true, avatar: avatarUrl });
  } catch (err) {
    console.error("Avatar upload error:", err);
    return res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
}
