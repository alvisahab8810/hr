// GET - all former / deactivated employees
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();
  try {
    const employees = await Employee.find({ isActive: false })
      .select("firstName lastName email employeeId personal professional salary exitStatus exitDate exitReason createdAt")
      .sort({ exitDate: -1 })
      .lean();
    return res.json({ success: true, employees });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
