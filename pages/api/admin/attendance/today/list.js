import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false });
  }

  try {
    await dbConnect();

    const admin = await getAdminFromReq(req, res);
    if (!admin) {
      return res.status(401).json({ success: false });
    }

    const today = new Date().toISOString().split("T")[0];



    // 🔹 STEP 5: Read filters from query
const {
  department,
  designation,
  employeeType,
  status,
} = req.query;

// 🔹 Build dynamic employee query
const employeeQuery = { isActive: true };

if (department) {
  employeeQuery["professional.department"] = department;
}

if (designation) {
  employeeQuery["professional.designation"] = designation;
}

if (employeeType) {
  employeeQuery["professional.employeeType"] = employeeType;
}

if (status) {
  employeeQuery["professional.status"] = status;
}


    // ✅ ONLY ACTIVE HR EMPLOYEES
    // const employees = await Employee.find({ isActive: true }).lean();

    // const employees = await Employee.find({ isActive: true }).lean();
    const employees = await Employee.find(employeeQuery).lean();


    const attendance = await Attendance.find({
      date: today,
      employee: { $in: employees.map((e) => e._id) },
    }).lean();

    const attendanceMap = {};
    attendance.forEach((a) => {
      attendanceMap[a.employee.toString()] = a;
    });


    

    const rows = employees.map((emp) => {
      const rec = attendanceMap[emp._id.toString()];

      let status = "Absent";
      if (rec?.startTime) {
        const t = new Date(rec.startTime);
        const isLate =
          t.getHours() > 10 || (t.getHours() === 10 && t.getMinutes() > 10);
        status = isLate ? "Late" : "On Time";
      }

      return {
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
        status,
      };
    });

    return res.json({
      success: true,
      employees: rows,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false });
  }
}
