

// // pages/api/time/break.js
// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/employees/Attendance";
// import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
// import { istDateString, istNow } from "@/utils/employees/ist";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();
//   await dbConnect();
//   const employee = await getEmployeeFromReq(req, res);
//   if (!employee) return;

//   const { action, type = "break" } = req.body; // action: 'start' | 'end'
//   const todayStr = istDateString();
//   const now = istNow();

//   const att = await Attendance.findOne({ employee: employee._id, date: todayStr, endTime: { $exists: false } });
//   if (!att) return res.status(400).json({ success: false, message: "Not clocked in" });

//   if (action === "start") {
//     // push a break with only start
//     att.breaks.push({ start: now, type });
//     att.status = "on_break";
//     await att.save();
//     return res.json({ success: true, attendance: att, message: "Break started" });
//   }

//   if (action === "end") {
//     // find last break without end
//     const breaks = att.breaks || [];
//     const last = breaks[breaks.length - 1];
//     if (!last || last.end) return res.status(400).json({ success: false, message: "No active break" });

//     last.end = now;
//     // att.status = "working";  
//     att.status = "clocked_in";

//     // recalc deduction incrementally (optional — final calculation on clock-out)
//     const totalBreakMs = att.totalBreakMs();
//     const lunchAllowMs = (parseInt(process.env.LUNCH_DURATION_MINUTES || "45") || 45) * 60000;
//     let deduction = 0;
//     if (totalBreakMs > lunchAllowMs) {
//       const extraMin = Math.ceil((totalBreakMs - lunchAllowMs) / 60000);
//       deduction = extraMin * (parseInt(process.env.LUNCH_DEDUCTION_PER_MIN || "5") || 5);
//     }
//     att.deductions = deduction;

//     await att.save();
//     return res.json({ success: true, attendance: att, message: "Break ended", deduction });
//   }

//   return res.status(400).json({ success: false, message: "Invalid action" });
// }





import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { istDateString, istNow } from "@/utils/employees/ist";
import { sendLunchReminderEmail } from "@/utils/email/sendLunchReminderEmail";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  const { action, type = "lunch" } = req.body;
  const todayStr = istDateString();
  const now = istNow();

  const att = await Attendance.findOne({
    employee: employee._id,
    date: todayStr,
    endTime: { $exists: false },
  });

  if (!att) {
    return res.status(400).json({
      success: false,
      message: "Not clocked in",
    });
  }

  /* ---------- START LUNCH ---------- */
  if (action === "start") {
    att.breaks.push({ start: now, type });
    att.status = "on_break";
    await att.save();

    return res.json({
      success: true,
      attendance: att,
      message: "Lunch started",
    });
  }

  /* ---------- END LUNCH ---------- */
  if (action === "end") {
    const last = att.breaks?.[att.breaks.length - 1];

    if (!last || last.end) {
      return res.status(400).json({
        success: false,
        message: "No active lunch",
      });
    }

    last.end = now;
    att.status = "clocked_in";

    const totalBreakMs = att.totalBreakMs();
    const allowedMs = 45 * 60 * 1000;

    let deduction = 0;
    if (totalBreakMs > allowedMs) {
      const extraMin = Math.ceil((totalBreakMs - allowedMs) / 60000);
      deduction = extraMin * 5;
    }

    att.deductions = deduction;

    /* ---------- SEND EMAIL ONCE ---------- */
    if (totalBreakMs > allowedMs && !att.lunchReminderSent) {
      const exceededMin = Math.ceil((totalBreakMs - allowedMs) / 60000);
      const totalMin    = Math.round(totalBreakMs / 60000);
      await sendLunchReminderEmail({
        to:      employee.email,
        name:    employee.firstName,
        minutes: totalMin,
        exceeded: exceededMin,
      }).catch(() => {});

      att.lunchReminderSent = true;
    }

    await att.save();

    return res.json({
      success: true,
      attendance: att,
      deduction,
      message: "Lunch ended",
    });
  }

  return res.status(400).json({
    success: false,
    message: "Invalid action",
  });
}
