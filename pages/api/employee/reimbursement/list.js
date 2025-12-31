import dbConnect from "@/utils/dbConnect";
import Reimbursement from "@/models/employees/Reimbursement";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const reimbursements = await Reimbursement.find({
      employee: employee._id,
    }).sort({ createdAt: -1 });

    return res.json({
      success: true,
      reimbursements,
    });
  } catch (err) {
    console.error("List reimbursement error:", err);
    return res.status(500).json({ success: false });
  }
}
