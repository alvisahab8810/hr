import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  const { slug } = req.query;

  await dbConnect();

  const employee = await Employee.findOne({ slug }); // find by slug
  if (!employee) {
    return res.status(404).json({ success: false, message: "Employee not found" });
  }

  res.json({ success: true, employee });
}
