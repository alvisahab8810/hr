// DELETE - permanently remove a former (already-deactivated) employee record
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  if (req.method !== "DELETE") return res.status(405).end();
  await dbConnect();
  const { id } = req.query;
  try {
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    if (employee.isActive) {
      return res.status(400).json({ success: false, message: "Cannot delete an active employee. Deactivate first." });
    }
    await Employee.findByIdAndDelete(id);
    return res.json({ success: true, message: "Employee permanently deleted" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
