import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // we handle the body
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const uploadDir = path.join(process.cwd(), "/public/uploads/medical-cert");

  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const form = formidable({ multiples: false, uploadDir, keepExtensions: true });

  form.parse(req, (err, fields, files) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const filePath = files.file[0].filepath;
    const fileName = path.basename(filePath);
    const fileUrl = `/uploads/medical-cert/${fileName}`;

    return res.status(200).json({ success: true, url: fileUrl });
  });
}
