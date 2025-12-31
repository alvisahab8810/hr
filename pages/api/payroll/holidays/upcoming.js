// // pages/api/payroll/holidays/upcoming.js
// import dbConnect from "@/utils/dbConnect";
// import Holiday from "@/models/payroll/Holiday";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   await dbConnect();

//   try {
//     const currentYear = new Date().getFullYear();
//     const today = new Date();

//     const holidays = await Holiday.find({
//       date: { $gte: today },
//     }).sort({ date: 1 });

//     return res.status(200).json({
//       success: true,
//       data: holidays,
//     });
//   } catch (err) {
//     console.error("Holidays API Error:", err);
//     return res.status(500).json({ success: false, message: "Server error" });
//   }
// }







import dbConnect from "@/utils/dbConnect";
import Holiday from "@/models/payroll/Holiday";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();

  try {
    const currentYear = new Date().getFullYear();
    const today = new Date();

    // ✅ Default holidays list for the year
    const defaultHolidays = [
      { name: "New Year", date: new Date(`${currentYear}-01-01`), description: "First day of the year" },
      { name: "Republic Day", date: new Date(`${currentYear}-01-26`), description: "National holiday" },
      { name: "Holi", date: new Date(`${currentYear}-03-14`), description: "Festival of colors" },
      { name: "Independence Day", date: new Date(`${currentYear}-08-15`), description: "National holiday" },
      { name: "Gandhi Jayanti", date: new Date(`${currentYear}-10-02`), description: "Birth anniversary of Mahatma Gandhi" },
      { name: "Diwali", date: new Date(`${currentYear}-10-20`), description: "Festival of lights" },
      { name: "Christmas", date: new Date(`${currentYear}-12-25`), description: "Celebration of Christmas" },
    ];

    // ✅ Check and insert missing holidays
    for (const holiday of defaultHolidays) {
      const exists = await Holiday.findOne({ name: holiday.name, date: holiday.date });
      if (!exists) {
        await Holiday.create(holiday);
      }
    }

    // ✅ Fetch upcoming holidays
    const holidays = await Holiday.find({ date: { $gte: today } }).sort({ date: 1 });

    return res.status(200).json({
      success: true,
      data: holidays,
    });
  } catch (err) {
    console.error("Holidays API Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
