import dbConnect from '../../../utils/dbConnect';

import TrackerLog from "@/models/Activity";

export default async function handler(req, res) {
  if (req.method === 'POST') {
    await dbConnect();

    const { employeeEmail, url, title, timeSpent, timestamp } = req.body;

    try {
      const newActivity = new TrackerLog({
        employeeEmail,
        url,
        title,
        timeSpent,
        timestamp,
      });
      await newActivity.save();
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error saving activity:', error);
      res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
