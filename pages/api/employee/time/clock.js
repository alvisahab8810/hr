import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { istDateString, istDateAt, istNow } from "@/utils/employees/ist";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return; // response handled inside helper

  const { action } = req.body; // 'clock-in' | 'clock-out'
  const todayStr = istDateString();
  const now = istNow();

  if (action === "clock-in") {
    // prevent double clock-in
    const existing = await Attendance.findOne({
      employee: employee._id,
      date: todayStr,
      endTime: { $exists: false },
    });
    if (existing && existing.startTime) {
      return res.status(400).json({ success: false, message: "Already clocked in" });
    }

    // const officeStart = istDateAt(parseInt(process.env.OFFICE_START_HOUR || "10"), 0);
    // const isLate = now > officeStart;

    const lateThreshold = istDateAt(10, 10);
    const isLate = now > lateThreshold;

    const att = await Attendance.create({
      employee: employee._id,
      date: todayStr,
      startTime: now,
      isLate,
      status: "clocked_in", // ✅ updated enum
    });

    return res.json({ success: true, attendance: att, message: "Clocked in", isLate });
  }

  if (action === "clock-out") {
    const att = await Attendance.findOne({
      employee: employee._id,
      date: todayStr,
      endTime: { $exists: false },
    });
    if (!att) return res.status(400).json({ success: false, message: "Not clocked in" });

    att.endTime = now;
    att.status = "clocked_out"; // ✅ updated enum

    // compute deduction based on breaks exceeding lunch allowance
    const totalBreakMs = att.totalBreakMs();
    const lunchAllowMs = (parseInt(process.env.LUNCH_DURATION_MINUTES || "45") || 45) * 60000;
    let deduction = 0;
    if (totalBreakMs > lunchAllowMs) {
      const extraMin = Math.ceil((totalBreakMs - lunchAllowMs) / 60000);
      deduction = extraMin * (parseInt(process.env.LUNCH_DEDUCTION_PER_MIN || "5") || 5);
    }
    att.deductions = deduction;

    await att.save();

    return res.json({ success: true, attendance: att, message: "Clocked out", deduction });
  }

  return res.status(400).json({ success: false, message: "Invalid action" });
}
