

// pages/api/admin/salary/generate.js
//
// SALARY CALCULATION LOGIC:
//
//  If generated mid-month (e.g. March 16):
//    → Only count working days from March 1 to March 16
//    → Salary = basicSalary × (elapsedWorkingDays / totalWorkingDaysInMonth)
//    → Deductions based only on elapsed days
//
//  If generated at/after month end:
//    → Full month calculation (basicSalary × 1.0)
//
//  Working day = Mon–Sat, excluding Sundays, public holidays
//  3rd Saturday = half day
//  Per-day rate always = basicSalary / totalWorkingDaysInMonth (for fair deductions)
//
import dbConnect from "@/utils/dbConnect";
import { getEmployeeFromToken } from "@/utils/auth";
import { generateSalaryForMonth } from "@/utils/payroll/generateSalaryForMonth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    const { employee: admin, error } = await getEmployeeFromToken(req);
    if (error || !admin || admin.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { month, year } = req.body; // month 0-indexed

    const results = await generateSalaryForMonth(month, year);

    return res.json({ success: true, count: results.length, data: results });

  } catch (err) {
    console.error("Salary generation error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
