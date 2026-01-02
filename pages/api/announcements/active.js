

// // pages/api/announcements/active.js
// import dbConnect from "@/utils/dbConnect";
// import Announcement from "../../../models/Announcement";

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method === "GET") {
//     try {
//       const now = new Date();

//       const announcements = await Announcement.find({
//         startDate: { $lte: now }, // already started
//         $or: [
//           { endDate: { $gte: now } }, // not expired
//           { endDate: null }, // no end date
//           { endDate: { $exists: false } }, // undefined
//         ],
//       }).sort({ createdAt: -1 });

//       res.status(200).json({ success: true, announcements });
//     } catch (error) {
//       res.status(400).json({ success: false, error: error.message });
//     }
//   } else {
//     res.status(405).json({ success: false, error: "Method not allowed" });
//   }
// }



import dbConnect from "@/utils/dbConnect";
import Announcement from "../../../models/Announcement";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  try {
    const now = new Date();

    // 🔑 start of today (00:00)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 🔑 end of today (23:59:59)
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const announcements = await Announcement.find({
      startDate: { $lte: endOfToday },
      endDate: { $gte: startOfToday },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      announcements,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}
