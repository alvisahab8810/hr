// pages/api/payroll/holidays/upcoming.js
import dbConnect from "@/utils/dbConnect";
import Holiday from "@/models/Holiday";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Return holidays whose endDate is today or in the future
    const holidays = await Holiday.find({
      isActive: true,
      endDate: { $gte: today },
    })
      .sort({ startDate: 1 })
      .limit(10)
      .lean();

    return res.status(200).json({ success: true, data: holidays });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}






// import dbConnect from "@/utils/dbConnect";
// import Holiday from "@/models/payroll/Holiday";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   await dbConnect();

//   try {
//     const today = new Date();
//     const currentYear = today.getFullYear();
//     const nextYear = currentYear + 1;

//     // ✅ Function to generate default holidays
//     const generateHolidays = (year) => [
//       {
//   name: "Holi",
//   date: new Date(`${year}-03-04`),
//   description: "Festival of Colors"
// },
// {
//   name: "Holi",
//   date: new Date(`${year}-03-05`),
//   description: "Festival of Colors"
// }
//       // { name: "New Year", date: new Date(`${year}-01-01`), description: "First day of the year" },
//       // { name: "Republic Day", date: new Date(`${year}-01-26`), description: "National holiday" },
//       // { name: "Holi", date: new Date(`${year}-03-14`), description: "Festival of colors" },
//       // { name: "Independence Day", date: new Date(`${year}-08-15`), description: "National holiday" },
//       // { name: "Gandhi Jayanti", date: new Date(`${year}-10-02`), description: "Birth anniversary of Mahatma Gandhi" },
//       // { name: "Diwali", date: new Date(`${year}-10-20`), description: "Festival of lights" },
//       // { name: "Christmas", date: new Date(`${year}-12-25`), description: "Celebration of Christmas" },
//     ];

//     // ✅ Ensure holidays exist for current & next year
//     const yearsToEnsure = [currentYear, nextYear];

//     for (const year of yearsToEnsure) {
//       const holidays = generateHolidays(year);

//       for (const holiday of holidays) {
//         const exists = await Holiday.findOne({
//           name: holiday.name,
//           date: holiday.date,
//         });

//         if (!exists) {
//           await Holiday.create(holiday);
//         }
//       }
//     }

//     // ✅ Fetch upcoming holidays (including next year)
//     const upcomingHolidays = await Holiday.find({
//       date: { $gte: today },
//     }).sort({ date: 1 });

//     return res.status(200).json({
//       success: true,
//       data: upcomingHolidays,
//     });
//   } catch (err) {
//     console.error("Holidays API Error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }
