import dbConnect from "@/utils/dbConnect";
import SalarySlip from "@/models/payroll/SalarySlip";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  try {
    const { employeeId, month, basicPay, allowances = 0, deductions = 0 } = req.body;

    // ✅ Debug log
    console.log("Incoming Data:", req.body);

    if (!employeeId || !month || basicPay === undefined) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // ✅ Extract year and month name
    const [year, monthNum] = month.split("-"); // "2025-06" → ["2025","06"]
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const monthName = monthNames[parseInt(monthNum, 10) - 1];

    const netPay = Number(basicPay) + Number(allowances) - Number(deductions);

    // ✅ Save Salary Slip
    const slip = await SalarySlip.create({
      employeeId,
      month: monthName,
      year: Number(year),
      basicPay: Number(basicPay),
      allowances: Number(allowances),
      deductions: Number(deductions),
      netPay,
    });

    return res.status(200).json({ success: true, message: "Salary slip created successfully", slip });
  } catch (error) {
    console.error("Error creating salary slip:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
