import dbConnect from '@/utils/dbConnect';
import Employee from "@/models/payroll/Employee"; // your schema file

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const employees = await Employee.find().sort({ createdAt: -1 });
      res.status(200).json({ success: true, employees });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch employees.' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}
