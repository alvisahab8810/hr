import dbConnect from "@/utils/dbConnect";
import SalarySlip from "@/models/payroll/SalarySlip";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  try {
    // ✅ Populate employee details
    const slips = await SalarySlip.find()
      .populate("employeeId", "firstName lastName email") // Fetch name & email
      .sort({ createdAt: -1 });

    // ✅ Format response
    const formattedSlips = slips.map((slip) => ({
      _id: slip._id,
      employeeName: `${slip.employeeId.firstName} ${slip.employeeId.lastName}`,
      email: slip.employeeId.email,
      month: slip.month,
      netPay: slip.netPay,
      pdfUrl: slip.pdfUrl || "", // if you plan to store PDF URL later
    }));

    return res.status(200).json({ success: true, slips: formattedSlips });
  } catch (error) {
    console.error("Error fetching slips:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
