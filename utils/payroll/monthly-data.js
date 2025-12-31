import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/payroll/Employee";
import Attendance from "@/models/payroll/Attendance";
import LeaveRequest from "@/models/payroll/LeaveRequest";

export default async function handler(req, res) {
  await dbConnect();

  try {
    const employees = await Employee.find({});
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const result = await Promise.all(
      employees.map(async (emp) => {
        const attendance = await Attendance.find({
          employeeId: emp._id,
          date: {
            $gte: new Date(currentYear, currentMonth, 1),
            $lte: new Date(currentYear, currentMonth + 1, 0),
          },
        });

        const leaves = await LeaveRequest.find({
          employeeId: emp._id,
          status: "Approved",
          from: { $gte: new Date(currentYear, currentMonth, 1) },
          to: { $lte: new Date(currentYear, currentMonth + 1, 0) },
        });

        return {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          salary: emp.salary || 0,
          attendance,
          leaves,
        };
      })
    );

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch monthly payroll data" });
  }
}
