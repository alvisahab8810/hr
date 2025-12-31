// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/payroll/Attendance";
// import { getEmployeeFromToken } from "@/utils/auth";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   await dbConnect();

//   const { employeeId, year, month } = req.query;

//   if (!employeeId || !year || !month) {
//     return res.status(400).json({ success: false, message: "Missing params" });
//   }

//   const start = new Date(`${year}-${month}-01`);
//   const end = new Date(start);
//   end.setMonth(start.getMonth() + 1);

//   const records = await Attendance.find({
//     employee: employeeId,
//     date: { $gte: start.toISOString().split("T")[0], $lt: end.toISOString().split("T")[0] },
//   });

//   res.status(200).json({
//     success: true,
//     data: records,
//   });
// }




import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/payroll/Attendance";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();

  const { employeeId, year, month } = req.query;
  if (!employeeId || !year || !month) {
    return res
      .status(400)
      .json({ success: false, message: "Missing params" });
  }

  // Ensure 2-digit month
  const mm = month.toString().padStart(2, "0");
  const prefix = `${year}-${mm}`; // e.g. "2025-07"

  try {
    const records = await Attendance.find({
      employee: employeeId,
      date: { $regex: `^${prefix}` }, // matches YYYY-MM-DD in this month
    })
      .lean()
      .exec();

    // Normalize response for calendar
    const data = records.map((r) => ({
      _id: r._id,
      date: r.date, // "YYYY-MM-DD"
      loginTime: r.loginTime || null,
      logoutTime: r.logoutTime || null,
      status: r.status,
      isHalfDay: r.isHalfDay,
      punches: r.punches || [],
      totalWorkedMinutes: r.totalWorkedMinutes ?? null,
      totalBreakMinutes: r.totalBreakMinutes ?? null,
      longestBreakMinutes: r.longestBreakMinutes ?? null,
      lunchBreakExceeded: !!r.lunchBreakExceeded,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Monthly attendance error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error", data: [] });
  }
}
