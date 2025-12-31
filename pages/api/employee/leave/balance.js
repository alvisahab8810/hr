import dbConnect from "@/utils/dbConnect";
import LeaveBalance from "@/models/employees/LeaveBalance";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const year = new Date().getFullYear();

    let balance = await LeaveBalance.findOne({
      employee: employee._id,
      year,
    });

    // If no record yet → return default policy values
    if (!balance) {
      return res.json({
        success: true,
        balance: {
          sick: { total: 10, used: 0 },
          earned: { total: 20, used: 0 },
          casual: { total: 20, used: 0 },
        },
      });
    }

 return res.json({
  success: true,
  balance: {
    sick: balance.sick,
    earned: balance.earned,
    casual: {
      total: balance.earned.total,
      used: balance.earned.used,
    },
  },
});

  } catch (err) {
    console.error("Leave balance error:", err);
    return res.status(500).json({ success: false });
  }
}
