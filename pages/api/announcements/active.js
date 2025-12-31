// // pages/api/announcements/active.js
// import dbConnect from "@/utils/dbConnect";
// import Announcement from "../../../models/Announcement";

// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method === "GET") {
//     try {
//       const now = new Date();
//       const announcements = await Announcement.find({
//         startDate: { $lte: now },
//         $or: [{ endDate: { $gte: now } }, { endDate: null }],
//       }).sort({ createdAt: -1 });

//       res.status(200).json({ success: true, announcements });
//     } catch (error) {
//       res.status(400).json({ success: false, error: error.message });
//     }
//   } else {
//     res.status(405).json({ success: false, error: "Method not allowed" });
//   }
// }



// pages/api/announcements/active.js
import dbConnect from "@/utils/dbConnect";
import Announcement from "../../../models/Announcement";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "GET") {
    try {
      const now = new Date();

      const announcements = await Announcement.find({
        startDate: { $lte: now }, // already started
        $or: [
          { endDate: { $gte: now } }, // not expired
          { endDate: null }, // no end date
          { endDate: { $exists: false } }, // undefined
        ],
      }).sort({ createdAt: -1 });

      res.status(200).json({ success: true, announcements });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: "Method not allowed" });
  }
}
