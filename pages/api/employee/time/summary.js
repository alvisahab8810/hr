
// pages/api/time/summary.js
import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { istDateString } from "@/utils/employees/ist";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();
  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  const todayStr = istDateString();
  const att = await Attendance.findOne({ employee: employee._id, date: todayStr });
  if (!att) return res.json({ success: true, data: null });

  const workedMs = att.totalWorkedMs();
  const breakMs = att.totalBreakMs();

  return res.json({
    success: true,
    data: {
      attendance: att,
      workedMs,
      breakMs,
      workedMinutes: Math.round(workedMs / 60000),
      breakMinutes: Math.round(breakMs / 60000),
    },
  });
}