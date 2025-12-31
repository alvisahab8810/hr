import dbConnect from '@/utils/dbConnect';
import Employee from '@/models/payroll/Employee';
import fs from 'fs';
import path from 'path';
import { IncomingForm } from 'formidable'; // ✅ Proper named import

export const config = {
  api: {
    bodyParser: false, // Required for formidable
  },
};

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === 'POST') {
    const form = new IncomingForm({
      keepExtensions: true,
      uploadDir: path.join(process.cwd(), '/public/uploads/employees'),
      multiples: false,
    });

    if (!fs.existsSync(form.uploadDir)) {
      fs.mkdirSync(form.uploadDir, { recursive: true });
    }

    form.parse(req, async (err, fields, files) => {
      if (err || !files.profile) {
        return res.status(400).json({ success: false, error: 'File upload failed.' });
      }

      const file = Array.isArray(files.profile) ? files.profile[0] : files.profile;
      const relativePath = `/uploads/employees/${path.basename(file.filepath || file.path)}`;

      try {
        await Employee.findByIdAndUpdate(id, { profileImage: relativePath }, { new: true });
        return res.status(200).json({ success: true, imageUrl: relativePath });
      } catch (e) {
        return res.status(500).json({ success: false, error: 'DB update failed' });
      }
    });
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
