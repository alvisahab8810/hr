// import dbConnect from "@/utils/dbConnect";
// import Attendance from "@/models/employees/Attendance";
// import Employee from "@/models/hr/Employee";
// import { istNow, istDateString } from "@/utils/employees/ist";
// import { sendLunchStartEmail, sendLunchOverEmail } from "@/utils/email/lunchEmails";

// export default async function handler(req, res) {
//   await dbConnect();

//   const now = istNow();
//   const today = istDateString();

//   const hour = now.getHours();
//   const minute = now.getMinutes();

//   /* =====================================================
//      1️⃣ 1:30 PM — LUNCH START REMINDER
//   ===================================================== */

//   if (hour === 13 && minute === 30) {
//     const records = await Attendance.find({
//       date: today,
//       endTime: { $exists: false },
//       status: "clocked_in",
//       lunchStartReminderSent: { $ne: true },
//     }).populate("employee");

//     for (const att of records) {
//       if (!att.employee?.email) continue;

//       await sendLunchStartEmail({
//         to: att.employee.email,
//         name: att.employee.firstName,
//       });

//       att.lunchStartReminderSent = true;
//       await att.save();
//     }
//   }

//   /* =====================================================
//      2️⃣ AFTER 45 MIN — OVER LUNCH REMINDER
//   ===================================================== */

//   const overLunchRecords = await Attendance.find({
//     date: today,
//     endTime: { $exists: false },
//     lunchOvertimeEmailSent: { $ne: true },
//     "breaks.type": "lunch",
//     "breaks.end": { $exists: false },
//   }).populate("employee");

//   for (const att of overLunchRecords) {
//     const lunch = att.breaks.find(
//       (b) => b.type === "lunch" && !b.end
//     );

//     if (!lunch) continue;

//     const diffMin = Math.floor(
//       (now - new Date(lunch.start)) / 60000
//     );

//     if (diffMin > 45) {
//       await sendLunchOverEmail({
//         to: att.employee.email,
//         name: att.employee.firstName,
//         minutes: diffMin,
//       });

//       att.lunchOvertimeEmailSent = true;
//       await att.save();
//     }
//   }

//   return res.json({ success: true });
// }




import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import Employee from "@/models/hr/Employee";
import { istNow, istDateString } from "@/utils/employees/ist";
import {
  sendLunchStartEmail,
  sendLunchOverEmail,
} from "@/utils/email/lunchEmails";

export default async function handler(req, res) {
  await dbConnect();

  const now = istNow();
  const today = istDateString();

  const hour = now.getHours();
  const minute = now.getMinutes();

  /* =====================================================
     1️⃣ 01:25 PM — LUNCH START REMINDER (5 min before)
  ===================================================== */

  if (hour === 13 && minute === 25) {
    const records = await Attendance.find({
      date: today,
      endTime: { $exists: false },
      status: "clocked_in",
      lunchStartReminderSent: { $ne: true },
    }).populate("employee");

    for (const att of records) {
      if (!att.employee?.email) continue;

      await sendLunchStartEmail({
        to: att.employee.email,
        name: att.employee.firstName,
      });

      att.lunchStartReminderSent = true;
      await att.save();
    }
  }

  /* =====================================================
     2️⃣ 40 MIN WARNING — LUNCH ABOUT TO EXCEED
     (Allowed lunch = 45 min, this is only awareness)
  ===================================================== */

  const overLunchRecords = await Attendance.find({
    date: today,
    endTime: { $exists: false },
    lunchOvertimeEmailSent: { $ne: true },
    "breaks.type": "lunch",
    "breaks.end": { $exists: false },
  }).populate("employee");

  for (const att of overLunchRecords) {
    const lunch = att.breaks.find(
      (b) => b.type === "lunch" && !b.end
    );

    if (!lunch) continue;

    const diffMin = Math.floor(
      (now - new Date(lunch.start)) / 60000
    );

    // 🔔 Awareness email at 40 minutes (02:10 PM)
    if (diffMin >= 40) {
      await sendLunchOverEmail({
        to: att.employee.email,
        name: att.employee.firstName,
        minutes: diffMin,
      });

      att.lunchOvertimeEmailSent = true;
      await att.save();
    }
  }

  return res.json({ success: true });
}
