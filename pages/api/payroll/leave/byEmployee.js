import dbConnect from "@/utils/dbConnect";
import LeaveRequest from "@/models/payroll/LeaveRequest";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();

  try {
    const { employeeId } = req.query;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: "Employee ID is required" });
    }

    const leaves = await LeaveRequest.find({ employeeId })
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    console.error("Leave by Employee API Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
