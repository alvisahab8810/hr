// pages/api/employee/birthdays/today.js
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  try {
    await dbConnect();
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const day   = now.getDate();

    // Fetch active employees who have a DOB
    const employees = await Employee.find(
      { isActive: true, "personal.dob": { $exists: true, $ne: null } },
      "firstName lastName personal.dob personal.avatar professional.designation professional.department employeeId"
    ).lean();

    const birthdays = employees.filter((emp) => {
      const dob = emp.personal?.dob;
      if (!dob) return false;
      const d = new Date(dob);
      return d.getMonth() + 1 === month && d.getDate() === day;
    }).map((emp) => ({
      _id:         emp._id,
      firstName:   emp.firstName,
      lastName:    emp.lastName,
      employeeId:  emp.employeeId,
      avatar:      emp.personal?.avatar || null,
      designation: emp.professional?.designation || null,
      department:  emp.professional?.department || null,
      dob:         emp.personal?.dob,
    }));

    res.json({ success: true, birthdays });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}
