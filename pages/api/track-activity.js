import dbConnect from "@/utils/dbConnect";
import Activity from "@/models/Activity";

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === "POST") {
    try {
      const { employeeEmail, url, title, timeSpent, timestamp } = req.body;

      const newActivity = new Activity({
        employeeEmail,
        url,
        title,
        timeSpent,
        timestamp: new Date(timestamp),
      });

      await newActivity.save();
      res.status(200).json({ success: true, message: "Activity saved" });
    } catch (error) {
      console.error("Error saving activity:", error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  } else {
    res.status(405).json({ success: false, message: "Method not allowed" });
  }
}
