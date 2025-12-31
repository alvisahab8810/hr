

// pages/api/employee/all.js
import { getEmployeeFromToken } from "@/utils/auth";
import Employee from "@/models/hr/Employee";
import dbConnect from "@/utils/dbConnect";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    // 🔐 Verify token & get user payload
    const { employee, error } = await getEmployeeFromToken(req);
    if (error || !employee) {
      return res.status(403).json({ success: false, message: error || "Unauthorized" });
    }

    // ⚡ (optional) check only admins can fetch all employees
    if (employee.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // 📌 Fetch employees
    const employees = await Employee.find()
      .select("personal professional salary status hasCompletedProfile")
      .lean();

    return res.json({ success: true, employees });
  } catch (err) {
    console.error("❌ Fetch employees error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
