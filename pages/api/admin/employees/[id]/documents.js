// pages/api/admin/employees/[id]/documents.js
// GET → return employee documents
// Admin can view all uploaded docs for any employee

import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).end(); return; }

  try {
    await dbConnect();

    const { employee: admin, error } = await getEmployeeFromToken(req);
    if (error || !admin || admin.role !== "admin") {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const { id } = req.query;
    const emp = await Employee.findById(id).select(
      "firstName lastName employeeId professional documents hasCompletedProfile"
    ).lean();

    if (!emp) { res.status(404).json({ success: false, message: "Employee not found" }); return; }

    res.json({ success: true, employee: emp });
  } catch (err) {
    console.error("Admin employee documents error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}