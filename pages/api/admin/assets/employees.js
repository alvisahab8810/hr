// GET - list employees for asset assignment (admin cookie auth)
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();
  try {
    const employees = await Employee.find()
      .select("personal professional firstName lastName email")
      .sort({ "personal.firstName": 1 })
      .lean();
    return res.json({ success: true, employees });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
