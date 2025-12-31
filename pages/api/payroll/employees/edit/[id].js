import dbConnect from '@/utils/dbConnect';
import Employee from '@/models/payroll/Employee';

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === 'PUT') {
    try {
      const updated = await Employee.findByIdAndUpdate(id, req.body, {
        new: true,
        runValidators: true,
      });

      if (!updated) {
        return res.status(404).json({ success: false, error: 'Employee not found' });
      }

      return res.status(200).json({ success: true, employee: updated });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: 'Failed to update employee.' });
    }
  } else {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }
}
