// GET /api/client/drive-folder?folderId=XXX  — list files inside a shared Drive folder
import jwt from "jsonwebtoken";

function getToken(req) {
  const cookie = req.headers.cookie || "";
  const match  = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const payload = getToken(req);
  if (!payload || payload.role !== "client") return res.status(401).json({ success: false });

  const { folderId } = req.query;
  if (!folderId) return res.status(400).json({ success: false, message: "folderId required" });

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    // No API key — return empty so UI falls back to embeddedfolderview
    return res.json({ success: true, files: [], fallback: true });
  }

  try {
    const q      = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const fields = encodeURIComponent("files(id,name,mimeType,thumbnailLink)");
    const url    = `https://www.googleapis.com/drive/v3/files?q=${q}&key=${apiKey}&fields=${fields}&pageSize=50&orderBy=name`;
    const r    = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(500).json({ success: false, message: data.error?.message || "Drive API error" });
    return res.json({ success: true, files: data.files || [] });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
