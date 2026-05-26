import dbConnect from "@/utils/dbConnect";
import LeaveBalance from "@/models/employees/LeaveBalance";
import LeaveApplication from "@/models/employees/LeaveApplication";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    // Indian financial year: April 1 – March 31
    const now = new Date();
    const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(fyYear, 3, 1);          // April 1
    const fyEnd   = new Date(fyYear + 1, 2, 31, 23, 59, 59); // March 31 EOD

    // Get leave totals (allocation) from balance record — fall back to policy defaults
    const balanceDoc = await LeaveBalance.findOne({ employee: employee._id, year: fyYear });

    const totals = {
      casual: balanceDoc?.casual?.total ?? 20,
      sick:   balanceDoc?.sick?.total   ?? 10,
      earned: balanceDoc?.earned?.total ?? 20,
    };

    // Calculate used days dynamically from approved leaves in this financial year
    const approvedLeaves = await LeaveApplication.find({
      employee: employee._id,
      status:   "Approved",
      startDate: { $gte: fyStart, $lte: fyEnd },
    }).lean();

    const used = { casual: 0, sick: 0, earned: 0 };

    for (const leave of approvedLeaves) {
      const days = leave.totalDays || 0;
      if (leave.leaveType === "Casual Leave") used.casual += days;
      else if (leave.leaveType === "Sick Leave") used.sick += days;
      else if (leave.leaveType === "Earned Leave") used.earned += days;
      else if (leave.leaveType === "Half Day") used.casual += days; // half day counts against casual
    }

    return res.json({
      success: true,
      balance: {
        casual: { total: totals.casual, used: Number(used.casual.toFixed(1)) },
        sick:   { total: totals.sick,   used: Number(used.sick.toFixed(1)) },
        earned: { total: totals.earned, used: Number(used.earned.toFixed(1)) },
      },
    });

  } catch (err) {
    console.error("Leave balance error:", err);
    return res.status(500).json({ success: false });
  }
}
