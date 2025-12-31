import dbConnect from "@/utils/dbConnect";
import SalarySlip from "@/models/payroll/SalarySlip";
import { getEmployeeFromToken } from "@/utils/auth"; // helper to extract employee from JWT

export default async function handler(req, res) {
  if (req.method !== "GET")
    return res.status(405).json({ success: false, message: "Method not allowed" });

  await dbConnect();

  try {
    // ✅ Get employee from JWT
    const employee = await getEmployeeFromToken(req);
    if (!employee)
      return res.status(401).json({ success: false, message: "Unauthorized" });

    const slips = await SalarySlip.find({ employeeId: employee._id })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, slips });
  } catch (error) {
    console.error("Error fetching employee slips:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
