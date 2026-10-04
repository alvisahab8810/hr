// POST /api/upload/page-media — upload a picture or a clip for a landing page
// section and hand back the URL that goes into the page's JSON.
//
// Same shape as upload/case-study-media.js next door, with the page builder's
// own ceilings: a clip stays under 8MB, and a picture has to be WebP under
// 200KB, because these load on the public site and nothing else keeps them
// small. The checks live here as well as in the browser — the browser's are a
// courtesy, this one is the rule.
import { formidable } from "formidable";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "pages");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const PUBLIC_ORIGIN = (process.env.PUBLIC_ORIGIN || "https://hq.viralon.in").replace(/\/+$/, "");

const MAX_VIDEO = 8 * 1024 * 1024;   // 8MB
const MAX_IMAGE = 200 * 1024;        // 200KB

export const config = { api: { bodyParser: false } };

function isAuthed(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      if (p?.id) return true;
    } catch {}
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
    maxFileSize: MAX_VIDEO,
    filename: (_n, ext) => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`,
  });

  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    const msg = err.code === 1009 ? "The file must be under 8MB" : "The upload did not go through";
    return res.status(400).json({ success: false, error: msg });
  }

  const file = (files.file || [])[0];
  if (!file) return res.status(400).json({ success: false, error: "No file received" });

  const drop = (error) => {
    fs.unlink(file.filepath, () => {});
    return res.status(400).json({ success: false, error });
  };

  const mime = file.mimetype || "";
  const ext = path.extname(file.filepath).toLowerCase();
  const isVideo = mime.startsWith("video/");
  const isImage = mime.startsWith("image/");

  if (!isVideo && !isImage) return drop("Only a picture or a video can go here");

  if (isImage) {
    if (mime !== "image/webp" || ext !== ".webp") return drop("Pictures have to be WebP");
    if (file.size > MAX_IMAGE) return drop("A picture has to be under 200KB");
  } else if (file.size > MAX_VIDEO) {
    return drop("A video has to be under 8MB");
  }

  const url = `${PUBLIC_ORIGIN}/uploads/pages/${path.basename(file.filepath)}`;
  return res.json({ success: true, url, kind: isVideo ? "video" : "image" });
}
