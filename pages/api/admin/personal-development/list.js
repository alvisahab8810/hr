// pages/api/admin/personal-development/list.js
// Admin fetches all employees' Personal Development grades for a given month/year

import dbConnect from "@/utils/dbConnect";
import PersonalDevelopmentGrade from "@/models/employees/PersonalDevelopmentGrade";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();

  const { month, year } = req.query;
  if (month === undefined || !year) {
    return res.status(400).json({ success: false, message: "month and year required" });
  }

  const grades = await PersonalDevelopmentGrade.find({
    month: Number(month),
    year: Number(year),
  }).lean();

  return res.json({ success: true, grades });
}
