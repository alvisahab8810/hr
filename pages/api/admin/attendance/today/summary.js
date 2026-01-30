

// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/employees/Attendance";
// import Employee from "@/models/hr/Employee";
// import { getEmployeeFromToken } from "@/utils/auth";
// import { INDIA_HOLIDAYS } from "@/utils/holidays/indiaHolidays";

// export default async function handler(req, res) {
//   if (req.method !== "GET") {
//     return res.status(405).json({ success: false });
//   }

//   try {
//     await dbConnect();

//     // ✅ PRODUCTION-SAFE ADMIN AUTH
//     const { employee, error } = await getEmployeeFromToken(req);

//     if (error || !employee || employee.role !== "admin") {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     const today = new Date().toISOString().split("T")[0];

//     const employees = await Employee.find({ isActive: true }).lean();
//     const attendance = await Attendance.find({ date: today }).lean();

//     const present = attendance.length;

//     const late = attendance.filter((rec) => {
//       if (!rec.startTime) return false;
//       const t = new Date(rec.startTime);
//       return t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
//     }).length;

//     const absent = employees.length - present;

//     // 🇮🇳 INDIAN OFFICIAL HOLIDAYS – CURRENT MONTH
//     const now = new Date();
//     const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

//     const monthHolidays = INDIA_HOLIDAYS.filter((h) =>
//       h.date.startsWith(currentMonth)
//     );

//     const holidayCount = monthHolidays.length;

//     const holidayLabel =
//       holidayCount > 0
//         ? monthHolidays
//             .map((h) => {
//               const day = h.date.split("-")[1];
//               return `${day} ${h.name}`;
//             })
//             .join(", ")
//         : "--";

//     return res.json({
//       success: true,
//       present,
//       absent,
//       late,
//       holidays: holidayCount,
//       holidayLabel,
//       presentPercentage: employees.length
//         ? Math.round((present / employees.length) * 100)
//         : 0,
//       latePercentage: employees.length
//         ? Math.round((late / employees.length) * 100)
//         : 0,
//     });
//   } catch (err) {
//     console.error("Admin attendance summary error:", err);
//     return res.status(500).json({ success: false });
//   }
// }






import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { getEmployeeFromToken } from "@/utils/auth";
import { INDIA_HOLIDAYS } from "@/utils/holidays/indiaHolidays";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false });
  }

  try {
    await dbConnect();

    // ✅ PRODUCTION-SAFE ADMIN AUTH
    const { employee, error } = await getEmployeeFromToken(req);

    if (error || !employee || employee.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // const today = new Date().toISOString().split("T")[0];

   // ⬆️ keep your imports and auth code as-is

const { date } = req.query;

if (!date) {
  return res.status(400).json({
    success: false,
    message: "Date is required",
  });
}

const employees = await Employee.find({ isActive: true }).lean();
const attendance = await Attendance.find({ date }).lean();


    const present = attendance.length;

    const late = attendance.filter((rec) => {
      if (!rec.startTime) return false;
      const t = new Date(rec.startTime);
      return t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
    }).length;

    const absent = employees.length - present;

    // 🇮🇳 INDIAN OFFICIAL HOLIDAYS – CURRENT MONTH
    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, "0");

    const monthHolidays = INDIA_HOLIDAYS.filter((h) =>
      h.date.startsWith(currentMonth)
    );

    const holidayCount = monthHolidays.length;

    const holidayLabel =
      holidayCount > 0
        ? monthHolidays
            .map((h) => {
              const day = h.date.split("-")[1];
              return `${day} ${h.name}`;
            })
            .join(", ")
        : "--";

    return res.json({
      success: true,
      present,
      absent,
      late,
      holidays: holidayCount,
      holidayLabel,
      presentPercentage: employees.length
        ? Math.round((present / employees.length) * 100)
        : 0,
      latePercentage: employees.length
        ? Math.round((late / employees.length) * 100)
        : 0,
    });
  } catch (err) {
    console.error("Admin attendance summary error:", err);
    return res.status(500).json({ success: false });
  }
}
