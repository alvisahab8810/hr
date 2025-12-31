// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/hr/Employee";
// import Attendance from "@/models/employees/Attendance";
// import LeaveApplication from "@/models/employees/LeaveApplication";
// import Reimbursement from "@/models/employees/Reimbursement";
// import SalaryReport from "@/models/hr/SalaryReport";
// import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();
//   const admin = await getAdminFromReq(req, res);
//   if (!admin) return res.status(401).json({ success: false });

//   const { month, year } = req.body;

//   const employees = await Employee.find({ isActive: true });
//   const results = [];

//   for (const emp of employees) {
//     // 🔹 Skip employees without salary
//     if (!emp.salary?.monthlySalary) continue;

//     const basicSalary = emp.salary.monthlySalary;

//     // 🔹 Month calculations
//     const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
//     const perDaySalary = basicSalary / totalDaysInMonth;

//     /* =====================================================
//        ATTENDANCE (PRESENT / ABSENT / LATE)
//     ===================================================== */

//     const attendance = await Attendance.find({
//       employee: emp._id,
//       createdAt: {
//         $gte: new Date(year, month, 1),
//         $lt: new Date(year, month + 1, 1),
//       },
//     });

//     // ✅ Count unique present days
//     const presentDays = new Set(
//       attendance
//         .filter((a) => a.startTime) // must have checked in
//         .map((a) => a.date)
//     ).size;

//     const absentDays = totalDaysInMonth - presentDays;

//     const absentDeduction = absentDays * perDaySalary;

//     // Late & other deductions (already stored)
//     const lateDeduction = attendance.reduce(
//       (sum, a) => sum + (a.latePenaltyAmount || 0),
//       0
//     );

//     const otherDeduction = attendance.reduce(
//       (sum, a) => sum + (a.deductions || 0),
//       0
//     );

//     /* =====================================================
//        UNPAID LEAVE (SANDWICH / POLICY)
//     ===================================================== */

//     const unpaidLeaves = await LeaveApplication.find({
//       employee: emp._id,
//       status: "Approved",
//       leaveType: "Casual Leave",
//       "policyFlags.sandwichLeave": true,
//       startDate: {
//         $gte: new Date(year, month, 1),
//         $lt: new Date(year, month + 1, 1),
//       },
//     });

//     const unpaidLeaveDays = unpaidLeaves.reduce(
//       (sum, l) => sum + l.totalDays,
//       0
//     );

//     const unpaidLeaveDeduction = unpaidLeaveDays * perDaySalary;

//     /* =====================================================
//        REIMBURSEMENT (ONLY PENDING)
//     ===================================================== */

//     const pendingReimbursements = await Reimbursement.find({
//       employee: emp._id,
//       status: "Pending",
//       createdAt: {
//         $gte: new Date(year, month, 1),
//         $lt: new Date(year, month + 1, 1),
//       },
//     });

//     const pendingReimAmount = pendingReimbursements.reduce(
//       (sum, r) => sum + r.amount,
//       0
//     );

//     /* =====================================================
//        TOTAL DEDUCTION & NET PAY
//     ===================================================== */

//     const totalDeduction =
//       absentDeduction +
//       lateDeduction +
//       unpaidLeaveDeduction +
//       otherDeduction;

//     const netPay =
//       basicSalary -
//       totalDeduction +
//       pendingReimAmount;

//     /* =====================================================
//        SAVE SALARY SNAPSHOT
//     ===================================================== */

//     const payrollId = `VN${Math.floor(1000 + Math.random() * 9000)}`;

//     const salary = await SalaryReport.findOneAndUpdate(
//       { employee: emp._id, month, year },
//       {
//         employee: emp._id,
//         month,
//         year,
//         payrollId,
//         basicSalary,

//         deductions: {
//           absent: absentDeduction,
//           late: lateDeduction,
//           unpaidLeave: unpaidLeaveDeduction,
//           other: otherDeduction,
//           total: totalDeduction,
//         },

//         reimbursement: {
//           pending: pendingReimAmount,
//         },

//         netPay,
//       },
//       { upsert: true, new: true }
//     );

//     results.push(salary);
//   }

//   return res.json({ success: true, data: results });
// }




import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Attendance from "@/models/employees/Attendance";
import LeaveApplication from "@/models/employees/LeaveApplication";
import Reimbursement from "@/models/employees/Reimbursement";
import SalaryReport from "@/models/hr/SalaryReport";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

/* ================= LATE PENALTY SLAB ================= */
function calculateLatePenalty(lateCount) {
  if (lateCount <= 2) return 0;
  if (lateCount === 3) return 500;
  if (lateCount <= 5) return 1500;
  if (lateCount <= 9) return 3500;
  return 5000;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();
  const admin = await getAdminFromReq(req, res);
  if (!admin) return res.status(401).json({ success: false });

  const { month, year } = req.body;

  const employees = await Employee.find({ isActive: true });
  const results = [];

  for (const emp of employees) {
    if (!emp.salary?.monthlySalary) continue;

    const basicSalary = emp.salary.monthlySalary;

    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const perDaySalary = basicSalary / totalDaysInMonth;

    /* ================= ATTENDANCE ================= */
    const attendance = await Attendance.find({
      employee: emp._id,
    //   createdAt: {
    //     $gte: new Date(year, month, 1),
    //     $lt: new Date(year, month + 1, 1),
    //   },


    date: {
  $gte: `${year}-${String(month + 1).padStart(2, "0")}-01`,
  $lte: `${year}-${String(month + 1).padStart(2, "0")}-31`,
},

    });

    // ✅ Present days (unique)
    const presentDays = new Set(
      attendance.filter(a => a.startTime).map(a => a.date)
    ).size;

    const absentDays = totalDaysInMonth - presentDays;
    const absentDeduction = absentDays * perDaySalary;

    // ✅ LATE COUNT (policy based)
    const lateCount = attendance.filter(
      a => a.isLate

    ).length;

    const lateDeduction = calculateLatePenalty(lateCount);

    // Other deductions (lunch / misc)
    const otherDeduction = attendance.reduce(
      (sum, a) => sum + (a.deductions || 0),
      0
    );

    /* ================= UNPAID LEAVE ================= */
    const unpaidLeaves = await LeaveApplication.find({
      employee: emp._id,
      status: "Approved",
      leaveType: "Casual Leave",
      "policyFlags.sandwichLeave": true,
      startDate: {
        $gte: new Date(year, month, 1),
        $lt: new Date(year, month + 1, 1),
      },
    });

    const unpaidLeaveDays = unpaidLeaves.reduce(
      (sum, l) => sum + l.totalDays,
      0
    );

    const unpaidLeaveDeduction = unpaidLeaveDays * perDaySalary;

    /* ================= REIMBURSEMENT (PENDING ONLY) ================= */
    const pendingReimbursements = await Reimbursement.find({
      employee: emp._id,
      status: "Pending",
      createdAt: {
        $gte: new Date(year, month, 1),
        $lt: new Date(year, month + 1, 1),
      },
    });

    const pendingReimAmount = pendingReimbursements.reduce(
      (sum, r) => sum + r.amount,
      0
    );

    /* ================= TOTAL ================= */
    const totalDeduction =
      absentDeduction +
      lateDeduction +
      unpaidLeaveDeduction +
      otherDeduction;

    const netPay =
      basicSalary -
      totalDeduction +
      pendingReimAmount;

    /* ================= SAVE SALARY ================= */
    const payrollId = `VN${Math.floor(1000 + Math.random() * 9000)}`;

    const salary = await SalaryReport.findOneAndUpdate(
      { employee: emp._id, month, year },
      {
        employee: emp._id,
        month,
        year,
        payrollId,
        basicSalary,

        deductions: {
          absent: absentDeduction,
          late: lateDeduction,
          unpaidLeave: unpaidLeaveDeduction,
          other: otherDeduction,
          total: totalDeduction,
        },

        reimbursement: {
          pending: pendingReimAmount,
        },

        netPay,
      },
      { upsert: true, new: true }
    );

    results.push(salary);
  }

  return res.json({ success: true, data: results });
}
