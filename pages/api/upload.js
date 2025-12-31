// pages/api/upload.js
import { IncomingForm } from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disables Next.js's default body parsing to handle form data correctly
  },
};

const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// Ensure the upload directory exists
fs.mkdirSync(uploadDir, { recursive: true });

export default async function handler(req, res) {
  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 5 * 1024 * 1024, // 5MB
    filename: (name, ext, part, form) => {
      return `${Date.now()}_${part.originalFilename}`;
    },
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(500).json({ success: false, message: 'File upload failed' });
    }

    const file = files.image;
    const filePath = path.relative(process.cwd(), file.filepath);
    const fileUrl = `/${filePath.replace(/\\/g, '/')}`;

    res.status(200).json({ success: true, file: { url: fileUrl } });
  });
}
