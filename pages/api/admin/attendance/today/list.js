// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/employees/Attendance";
// import Employee from "@/models/hr/Employee";
// import { getEmployeeFromToken } from "@/utils/auth";


// function getLunchInfo(breaks = []) {
//   const lunch = breaks.find((b) => b.type === "lunch");
//   if (!lunch) return { status: "--", duration: "--" };

//   if (lunch.start && !lunch.end) {
//     const mins = Math.floor(
//       (Date.now() - new Date(lunch.start)) / 60000
//     );
//     return {
//       status: "On Lunch",
//       duration: `${mins} min`,
//     };
//   }

//   if (lunch.start && lunch.end) {
//     const mins = Math.floor(
//       (new Date(lunch.end) - new Date(lunch.start)) / 60000
//     );
//     return {
//       status: "Lunch Taken",
//       duration: `${mins} min`,
//     };
//   }

//   return { status: "--", duration: "--" };
// }


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

//     // 🔹 Read filters from query
//     const { department, designation, employeeType, status } = req.query;

//     // 🔹 Build dynamic employee query
//     const employeeQuery = { isActive: true };

//     if (department) {
//       employeeQuery["professional.department"] = department;
//     }

//     if (designation) {
//       employeeQuery["professional.designation"] = designation;
//     }

//     if (employeeType) {
//       employeeQuery["professional.employeeType"] = employeeType;
//     }

//     if (status) {
//       employeeQuery["professional.status"] = status;
//     }

//     const employees = await Employee.find(employeeQuery).lean();

//     const attendance = await Attendance.find({
//       date: today,
//       employee: { $in: employees.map((e) => e._id) },
//     }).lean();

//     const attendanceMap = {};
//     attendance.forEach((a) => {
//       attendanceMap[a.employee.toString()] = a;
//     });

//     const rows = employees.map((emp) => {
//       const rec = attendanceMap[emp._id.toString()];

//       const lunchInfo = rec ? getLunchInfo(rec.breaks) : { status: "--", duration: "--" };


//       let statusText = "Absent";
//       if (rec?.startTime) {
//         const t = new Date(rec.startTime);
//         const isLate =
//           t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
//         statusText = isLate ? "Late" : "On Time";
//       }

//    return {
//   name: `${emp.firstName} ${emp.lastName}`.trim(),
//   designation: emp.professional?.designation || "--",
//   type: emp.professional?.employeeType || "Office",

//   checkIn: rec?.startTime
//     ? new Date(rec.startTime).toLocaleTimeString([], {
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     : "--",

//   checkOut: rec?.endTime
//     ? new Date(rec.endTime).toLocaleTimeString([], {
//         hour: "2-digit",
//         minute: "2-digit",
//       })
//     : "--",

//   lunch: lunchInfo.duration,      // ✅ NEW
//   lunchStatus: lunchInfo.status,  // ✅ NEW

//   status: statusText,
// };

//     });

//     return res.json({
//       success: true,
//       employees: rows,
//     });
//   } catch (err) {
//     console.error("Admin attendance list error:", err);
//     return res.status(500).json({ success: false });
//   }
// }



import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { getEmployeeFromToken } from "@/utils/auth";

function getLunchInfo(breaks = []) {
  const lunch = breaks.find((b) => b.type === "lunch");
  if (!lunch) return { status: "--", duration: "--", durationMins: 0 };

  if (lunch.start && !lunch.end) {
    const mins = Math.floor(
      (Date.now() - new Date(lunch.start)) / 60000
    );
    return { status: "On Lunch", duration: `${mins} min`, durationMins: mins };
  }

  if (lunch.start && lunch.end) {
    const mins = Math.floor(
      (new Date(lunch.end) - new Date(lunch.start)) / 60000
    );
    return { status: "Lunch Taken", duration: `${mins} min`, durationMins: mins };
  }

  return { status: "--", duration: "--", durationMins: 0 };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false });
  }

  try {
    await dbConnect();

    // ✅ ADMIN AUTH
    const { employee, error } = await getEmployeeFromToken(req);
    if (error || !employee || employee.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ DATE FROM FRONTEND
    const { date, department, designation, employeeType, status } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required",
      });
    }

    // 🔹 EMPLOYEE FILTERS
    const employeeQuery = { isActive: true };

    if (department)
      employeeQuery["professional.department"] = department;

    if (designation)
      employeeQuery["professional.designation"] = designation;

    if (employeeType)
      employeeQuery["professional.employeeType"] = employeeType;

    if (status)
      employeeQuery["professional.status"] = status;

    const employees = await Employee.find(employeeQuery).lean();

    // ✅ FIXED: USE `date`, NOT `today`
    const attendance = await Attendance.find({
      date,
      employee: { $in: employees.map((e) => e._id) },
    }).lean();

    const attendanceMap = {};
    attendance.forEach((a) => {
      attendanceMap[a.employee.toString()] = a;
    });

    const rows = employees.map((emp) => {
      const rec = attendanceMap[emp._id.toString()];
      const lunchInfo = rec
        ? getLunchInfo(rec.breaks)
        : { status: "--", duration: "--" };

      let statusText = "Absent";
      if (rec?.startTime) {
        const t = new Date(rec.startTime);
        const isLate =
          t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
        statusText = isLate ? "Late" : "On Time";
      }

      return {
         employeeId: emp._id,   // ✅ REQUIRED
        name: `${emp.firstName} ${emp.lastName}`.trim(),
        designation: emp.professional?.designation || "--",
        type: emp.professional?.employeeType || "Office",

        checkIn: rec?.startTime
          ? new Date(rec.startTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--",

        checkOut: rec?.endTime
          ? new Date(rec.endTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "--",

        lunch: lunchInfo.duration,
        lunchStatus: lunchInfo.status,
        lunchMins: lunchInfo.durationMins,
        status: statusText,
      };
    });

    return res.json({
      success: true,
      employees: rows,
    });
  } catch (err) {
    console.error("Admin attendance list error:", err);
    return res.status(500).json({ success: false });
  }
}
