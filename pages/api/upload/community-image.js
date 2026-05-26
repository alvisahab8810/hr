// POST /api/upload/community-image — save image to public/uploads/community, return URL
import { formidable } from "formidable";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "community");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const config = {
  api: { bodyParser: false },
};

function isAuthed(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try { const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET); if (p?.id) return true; } catch {}
  }
  if ((req.headers.cookie || "").includes("admin_auth=true")) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!isAuthed(req)) return res.status(401).json({ success: false, error: "Unauthorized" });

  const form = formidable({
    uploadDir: UPLOAD_DIR,
    keepExtensions: true,
    maxFileSize: 200 * 1024,
    filename: (_name, ext) => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`,
  });

  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    const msg = err.code === 1009 ? "Image must be under 200KB" : "Upload failed";
    return res.status(400).json({ success: false, error: msg });
  }

  const fileArr = files.file;
  if (!fileArr || fileArr.length === 0) {
    return res.status(400).json({ success: false, error: "No file received" });
  }

  const file = fileArr[0];
  if (!(file.mimetype || "").startsWith("image/")) {
    fs.unlink(file.filepath, () => {});
    return res.status(400).json({ success: false, error: "Only image files allowed" });
  }

  const filename = path.basename(file.filepath);
  return res.json({ success: true, url: `/uploads/community/${filename}` });
}
