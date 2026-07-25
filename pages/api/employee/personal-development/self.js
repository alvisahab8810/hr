// pages/api/employee/personal-development/self.js
// Employee fetches their own Personal Development grade for a given month/year

import dbConnect from "@/utils/dbConnect";
import PersonalDevelopmentGrade from "@/models/employees/PersonalDevelopmentGrade";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const { month, year } = req.query;
    if (month === undefined || !year) {
      return res.status(400).json({ success: false, message: "month and year required" });
    }

    const grade = await PersonalDevelopmentGrade.findOne({
      employee: employee._id,
      month: Number(month),
      year: Number(year),
    }).lean();

    return res.json({ success: true, grade: grade || null });
  } catch (err) {
    console.error("❌ Personal development self error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
