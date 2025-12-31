import dbConnect from "@/utils/dbConnect";
import SalarySlip from "@/models/payroll/SalarySlip";

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, message: "Method not allowed" });

  await dbConnect();

  try {
    const { id } = req.query; // employeeId
    const slips = await SalarySlip.find({ employeeId: id }).sort({ generatedAt: -1 });

    return res.status(200).json({ success: true, slips });
  } catch (err) {
    console.error("Error fetching slips:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
