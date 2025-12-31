// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/payroll/Employee";
// import Attendance from "@/models/payroll/Attendance";

// export default async function handler(req, res) {
//   await dbConnect();

//   try {
//     const employees = await Employee.find().lean();
//     const currentMonth = new Date().getMonth();
//     const currentYear = new Date().getFullYear();

//     const report = await Promise.all(
//       employees.map(async (emp) => {
//         const attendance = await Attendance.find({
//           employee: emp._id,
//           date: { $regex: `^${currentYear}-${String(currentMonth + 1).padStart(2, "0")}` },
//         }).lean();

//         // Compute late marks
//         const lateMarks = attendance.filter((a) => a.lateMark).length;
//         let latePenalty = 0;
//         if (lateMarks >= 10) latePenalty = 5000;
//         else if (lateMarks >= 6) latePenalty = 3500;
//         else if (lateMarks >= 4) latePenalty = 1500;
//         else if (lateMarks >= 3) latePenalty = 500;

//         // Compute lunch penalty
//         const lunchPenalty = attendance.reduce(
//           (acc, a) => acc + (a.longestBreakMinutes > 50 ? (a.longestBreakMinutes - 50) * 5 : 0),
//           0
//         );

//         // LOP & half-day deductions (basic example)
//         const lopDays = attendance.filter((a) => a.status === "absent").length;
//         const halfDays = attendance.filter((a) => a.isHalfDay).length;
//         const perDaySalary = emp.salary / 26; // fixed 26-day basis
//         const lopDeduction = lopDays * perDaySalary + (halfDays * perDaySalary) / 2;

//         const totalDeduction = latePenalty + lunchPenalty + lopDeduction;
//         const netPayable = emp.salary - totalDeduction;

//         return {
//           employeeId: emp.employeeId,
//           fullName: `${emp.firstName} ${emp.lastName}`,
//           salary: emp.salary,
//           lateMarks,
//           latePenalty,
//           lunchPenalty,
//           lopDays,
//           halfDays,
//           totalDeduction,
//           netPayable,
//         };
//       })
//     );

//     res.status(200).json(report);
//   } catch (error) {
//     console.error("Monthly data error:", error);
//     res.status(500).json({ error: "Failed to generate salary report" });
//   }
// }






// import Attendance from "@/models/payroll/Attendance";
// import { eachDayOfInterval, format, isSunday } from "date-fns";
// import LeaveRequest from "@/models/payroll/LeaveRequest";
// import Employee from "@/models/payroll/Employee";
// import dbConnect from "@/utils/dbConnect";

// export default async function handler(req, res) {
//   await dbConnect();
//   const month = req.query.month || new Date().getMonth(); // 0-index
//   const year = req.query.year || new Date().getFullYear();

//   const start = new Date(year, month, 1);
//   const end = new Date(year, month + 1, 0);
//   const days = eachDayOfInterval({ start, end });

//   const employees = await Employee.find({});
//   const results = [];

//   for (const emp of employees) {
//     const attendanceRecords = await Attendance.find({
//       employee: emp._id,
//       date: { $gte: format(start, "yyyy-MM-dd"), $lte: format(end, "yyyy-MM-dd") },
//     });

//     const leaveRecords = await LeaveRequest.find({
//       employeeId: emp._id,
//       from: { $lte: end },
//       to: { $gte: start },
//     });

//     let lopDays = 0;
//     let presentDays = 0;
//     let halfDays = 0;

//     days.forEach((d) => {
//       const dateStr = format(d, "yyyy-MM-dd");

//       if (isSunday(d)) return; // skip weekends

//       const att = attendanceRecords.find((a) => a.date === dateStr);
//       const leave = leaveRecords.find((l) => new Date(l.from) <= d && new Date(l.to) >= d);

//       if (att) {
//         if (att.isHalfDay) halfDays += 1;
//         else presentDays += 1;
//       } else if (leave) {
//         // Paid leave? No LOP
//       } else {
//         lopDays += 1;
//       }
//     });

//     const baseSalary = emp.salary || 0;
//     const perDay = baseSalary / 26;
//     const lopDeduction = lopDays * perDay;

//     results.push({
//       employeeId: emp.employeeId,
//       fullName: emp.firstName + " " + emp.lastName,
//       salary: baseSalary,
//       lopDays,
//       halfDays,
//       totalDeduction: lopDeduction,
//       netPayable: baseSalary - lopDeduction,
//     });
//   }

//   res.status(200).json(results);
// }














// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/payroll/Employee";
// import Attendance from "@/models/payroll/Attendance";
// import LeaveRequest from "@/models/payroll/LeaveRequest"; // If you track leaves separately
// import { eachDayOfInterval, isSunday, format } from "date-fns";

// export default async function handler(req, res) {
//   await dbConnect();

//   try {
//     const employees = await Employee.find().lean();

//     const now = new Date();
//     const currentMonth = now.getMonth();
//     const currentYear = now.getFullYear();

//     // Generate all days in the current month
//     const startOfMonth = new Date(currentYear, currentMonth, 1);
//     const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
//     const allDays = eachDayOfInterval({ start: startOfMonth, end: endOfMonth });

//     const report = await Promise.all(
//       employees.map(async (emp) => {
//         // Get all attendance records for current month
//         const attendance = await Attendance.find({
//           employee: emp._id,
//           date: { $regex: `^${currentYear}-${String(currentMonth + 1).padStart(2, "0")}` },
//         }).lean();

//         // Get approved leaves for this employee (optional)
//         const approvedLeaves = await LeaveRequest.find({
//           employeeId: emp._id,
//           status: "Approved",
//           from: { $lte: endOfMonth },
//           to: { $gte: startOfMonth },
//         }).lean();

//         // Map leaves to quick lookup
//         const leaveDaysMap = {};
//         approvedLeaves.forEach((lv) => {
//           const from = new Date(lv.from);
//           const to = new Date(lv.to);
//           const days = eachDayOfInterval({ start: from, end: to });
//           days.forEach((d) => (leaveDaysMap[format(d, "yyyy-MM-dd")] = lv.type));
//         });

//         // Build day status: present, half-day, leave, or absent
//         let lopDays = 0;
//         let halfDays = 0;
//         let lateMarks = 0;
//         let lunchPenalty = 0;

//         allDays.forEach((day) => {
//           const dateStr = format(day, "yyyy-MM-dd");
//           if (isSunday(day)) return; // Skip Sundays as non-working days

//           const att = attendance.find((a) => a.date === dateStr);
//           if (att) {
//             // Late arrival check
//             if (att.lateMark) lateMarks++;

//             // Lunch penalty check
//             if (att.longestBreakMinutes > 50) {
//               lunchPenalty += (att.longestBreakMinutes - 50) * 5; // ₹5 per min over 50m
//             }

//             // Half-day or absent
//             if (att.isHalfDay) {
//               halfDays++;
//             } else if (att.status === "absent") {
//               lopDays++;
//             }
//           } else {
//             // No attendance => check leave or absent
//             if (!leaveDaysMap[dateStr]) {
//               lopDays++; // Absent without leave
//             }
//           }
//         });

//         // Late penalty based on policy
//         let latePenalty = 0;
//         if (lateMarks >= 10) latePenalty = 5000;
//         else if (lateMarks >= 6) latePenalty = 3500;
//         else if (lateMarks >= 4) latePenalty = 1500;
//         else if (lateMarks >= 3) latePenalty = 500;

//         // Salary deductions
//         const perDaySalary = emp.salary / 26; // Fixed 26 days salary calculation
//         const lopDeduction = lopDays * perDaySalary + (halfDays * perDaySalary) / 2;
//         const totalDeduction = latePenalty + lunchPenalty + lopDeduction;
//         const netPayable = emp.salary - totalDeduction;

//         return {
//           employeeId: emp.employeeId,
//           fullName: `${emp.firstName} ${emp.lastName}`,
//           salary: emp.salary,
//           lateMarks,
//           latePenalty,
//           lunchPenalty,
//           lopDays,
//           halfDays,
//           totalDeduction,
//           netPayable,
//         };
//       })
//     );

//     res.status(200).json(report);
//   } catch (error) {
//     console.error("Monthly data error:", error);
//     res.status(500).json({ error: "Failed to generate salary report" });
//   }
// }






import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/payroll/Employee";
import Attendance from "@/models/payroll/Attendance";
import LeaveRequest from "@/models/payroll/LeaveRequest";
import { eachDayOfInterval, isSunday, format } from "date-fns";
import { HR_POLICY } from "@/config/hrPolicy"; // Import HR policy (late arrival cutoff etc.)

export default async function handler(req, res) {
  await dbConnect();

  try {
    const employees = await Employee.find().lean();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const startOfMonth = new Date(currentYear, currentMonth, 1);
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const allDays = eachDayOfInterval({ start: startOfMonth, end: endOfMonth });

    const report = await Promise.all(
      employees.map(async (emp) => {
        const attendance = await Attendance.find({
          employee: emp._id,
          date: { $regex: `^${currentYear}-${String(currentMonth + 1).padStart(2, "0")}` },
        }).lean();

        // Approved leaves
        const approvedLeaves = await LeaveRequest.find({
          employeeId: emp._id,
          status: "Approved",
          from: { $lte: endOfMonth },
          to: { $gte: startOfMonth },
        }).lean();

        const leaveDaysMap = {};
        approvedLeaves.forEach((lv) => {
          const days = eachDayOfInterval({ start: new Date(lv.from), end: new Date(lv.to) });
          days.forEach((d) => (leaveDaysMap[format(d, "yyyy-MM-dd")] = lv.type));
        });

        let lopDays = 0;
        let halfDays = 0;
        let lateMarks = 0;
        let lunchPenalty = 0;

        const [graceHour, graceMin] = (HR_POLICY?.lateArrival?.graceTime || "10:10")
          .split(":")
          .map(Number);

        allDays.forEach((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          if (isSunday(day)) return; // Skip weekends

          const att = attendance.find((a) => a.date === dateStr);

          if (att) {
            // --- Late Arrival Check ---
            if (att.punches?.length) {
              const firstIn = new Date(att.punches[0].in);
              const cutoff = new Date(firstIn);
              cutoff.setHours(graceHour, graceMin, 0, 0);
              if (firstIn > cutoff) lateMarks++;
            }

            // --- Lunch Penalty ---
            if (att.longestBreakMinutes > 50) {
              lunchPenalty += (att.longestBreakMinutes - 50) * 5;
            }

            // --- Half-day / Absent ---
            if (att.isHalfDay) {
              halfDays++;
            } else if (att.totalWorkedMinutes < 10) {
              // No work => count as absent
              lopDays++;
            }
          } else if (!leaveDaysMap[dateStr]) {
            // No attendance & no leave
            lopDays++;
          }
        });

        // --- Late Penalty Policy ---
        let latePenalty = 0;
        if (lateMarks >= 10) latePenalty = 5000;
        else if (lateMarks >= 6) latePenalty = 3500;
        else if (lateMarks >= 4) latePenalty = 1500;
        else if (lateMarks >= 3) latePenalty = 500;

        // --- Salary Calculation ---
        const perDaySalary = emp.salary / 26;
        const lopDeduction = lopDays * perDaySalary + (halfDays * perDaySalary) / 2;
        const totalDeduction = latePenalty + lunchPenalty + lopDeduction;
        const netPayable = Math.max(0, emp.salary - totalDeduction);

        return {
          employeeId: emp.employeeId,
          fullName: `${emp.firstName} ${emp.lastName}`,
          salary: emp.salary,
          lateMarks,
          latePenalty,
          lunchPenalty,
          lopDays,
          halfDays,
          totalDeduction,
          netPayable,
        };
      })
    );

    res.status(200).json(report);
  } catch (error) {
    console.error("Monthly data error:", error);
    res.status(500).json({ error: "Failed to generate salary report" });
  }
}
