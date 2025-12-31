import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();

    const { employee, error } = await getEmployeeFromToken(req);
    if (error || !employee) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (employee.role !== "admin") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const records = await Attendance.find({})
      .populate("employee", "firstName lastName professional personal")
      .sort({ startTime: -1 })
      .lean();

    const LATE_HOUR = 10;
    const LATE_MIN = 10;
    const DUTY_END_HOUR = 18;

    const employees = records.map((rec) => {
      const emp = rec.employee;
      const checkIn = rec.startTime ? new Date(rec.startTime) : null;
      const checkOut = rec.endTime ? new Date(rec.endTime) : null;

      // ----- PUNCTUALITY STATUS -----
      let punctuality = "Not Clocked In";

      if (checkIn) {
        const isLate =
          checkIn.getHours() > LATE_HOUR ||
          (checkIn.getHours() === LATE_HOUR &&
            checkIn.getMinutes() > LATE_MIN);

        punctuality = isLate ? "Late" : "On Time";
      }

      // ----- CHECKOUT STATUS -----
      let checkOutLabel = "--";
      if (checkOut) {
        checkOutLabel = checkOut.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (checkIn) {
        const now = new Date();
        if (
          now.toDateString() !== checkIn.toDateString() ||
          now.getHours() >= DUTY_END_HOUR
        ) {
          checkOutLabel = "Missing Checkout";
        }
      }

      return {
        id: rec._id,
        employeeId: emp?._id,
        name: emp ? `${emp.firstName} ${emp.lastName}` : "—",
        designation: emp?.professional?.designation || "—",
        type: emp?.professional?.employeeType || "Office",
        avatar: emp?.personal?.avatar || null,
        date: checkIn
          ? checkIn.toISOString().split("T")[0]
          : rec.date,
        checkIn: checkIn
          ? checkIn.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "--",
        checkOut: checkOutLabel,
        status: punctuality,
      };
    });

    return res.json({ success: true, employees });
  } catch (err) {
    console.error("❌ Attendance API error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
