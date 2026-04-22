// POST - reactivate a former employee
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();
  const { id } = req.query;
  try {
    const employee = await Employee.findByIdAndUpdate(
      id,
      { $set: { isActive: true, exitStatus: null, exitDate: null, exitReason: null } },
      { new: true }
    );
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    return res.json({ success: true, message: "Employee reactivated", employee });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
