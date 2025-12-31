
import dbConnect from '@/utils/dbConnect';
import Employee from "@/models/payroll/Employee"; // your schema file

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  try {
    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ success: false, error: "Employee not found" });
    }
    res.status(200).json({ success: true, employee });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error" });
  }
}
