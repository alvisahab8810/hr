// // pages/api/announcements/create.js
// import dbConnect from "@/utils/dbConnect";
// import Announcement from "../../../models/Announcement";



// export default async function handler(req, res) {
//   await dbConnect();

//   if (req.method === "POST") {
//     try {

//       const announcement = await Announcement.create(req.body);
//       res.status(201).json({ success: true, announcement });
//     } catch (error) {
//       res.status(400).json({ success: false, error: error.message });
//     }
//   } else {
//     res.status(405).json({ success: false, error: "Method not allowed" });
//   }
// }



// pages/api/announcements/create.js
import dbConnect from "@/utils/dbConnect";
import Announcement from "../../../models/Announcement";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const { title, message, priority, startDate, endDate } = req.body;

      const announcement = await Announcement.create({
        title,
        message,
        priority,
        startDate: startDate ? new Date(startDate) : new Date(), // default now
        endDate: endDate ? new Date(endDate) : null,
      });

      res.status(201).json({ success: true, announcement });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  } else {
    res.status(405).json({ success: false, error: "Method not allowed" });
  }
}
