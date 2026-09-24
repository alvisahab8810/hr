// POST /api/upload/case-study-media — save an image or a video for a case
// study and hand back the URL the website will render.
//
// The file lands on THIS server (public/uploads/case-studies), but the page
// that shows it is served by viralon-new on another origin, so the URL that
// goes into the database has to be absolute. Set PUBLIC_ORIGIN when this app
// moves; local dev wants PUBLIC_ORIGIN=http://localhost:3001 (or whichever
// port this runs on) so uploads resolve while both apps are up.
//
// Same shape as upload/community-image.js next door, with a video branch and a
// larger ceiling -- the hero clip on a case study is not a 200KB avatar.
import { formidable } from "formidable";
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "case-studies");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const PUBLIC_ORIGIN = (process.env.PUBLIC_ORIGIN || "https://hq.viralon.in").replace(
  /\/+$/,
  ""
);

const MAX_BYTES = 40 * 1024 * 1024; // 40MB — enough for a short vertical clip

export const config = {
  api: { bodyParser: false },
};

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
  if (!isAuthed(req))
    return res.status(401).json({ success: false, error: "Unauthorized" });

  const form = formidable({
    uploadDir: UPLOAD_DIR,
    keepExtensions: true,
    maxFileSize: MAX_BYTES,
    filename: (_name, ext) =>
      `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`,
  });

  let files;
  try {
    [, files] = await form.parse(req);
  } catch (err) {
    const msg = err.code === 1009 ? "File must be under 40MB" : "Upload failed";
    return res.status(400).json({ success: false, error: msg });
  }

  const fileArr = files.file;
  if (!fileArr || fileArr.length === 0) {
    return res.status(400).json({ success: false, error: "No file received" });
  }

  const file = fileArr[0];
  const mime = file.mimetype || "";
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  if (!isImage && !isVideo) {
    fs.unlink(file.filepath, () => {});
    return res
      .status(400)
      .json({ success: false, error: "Only image or video files allowed" });
  }

  const filename = path.basename(file.filepath);
  const url = `${PUBLIC_ORIGIN}/uploads/case-studies/${filename}`;
  return res.json({ success: true, url, kind: isVideo ? "video" : "image" });
}
