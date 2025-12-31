// pages/api/employee/[id].js
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  if (req.method === "GET") {
    try {
      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }
      res.status(200).json({ success: true, employee });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  } else {
    res.status(405).json({ success: false, message: "Method not allowed" });
  }
}
