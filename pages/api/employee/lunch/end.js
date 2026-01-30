import dbConnect from "@/utils/dbConnect";
import Attendance from "@/models/employees/Attendance";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    const { employee, error } = await getEmployeeFromToken(req);
    if (error || !employee) {
      return res.status(401).json({ success: false });
    }

    const today = new Date().toISOString().split("T")[0];

    const attendance = await Attendance.findOne({
      employee: employee._id,
      date: today,
    });

    if (!attendance) {
      return res.status(400).json({ success: false });
    }

    const lunch = attendance.breaks.find(
      (b) => b.type === "lunch" && !b.end
    );

    if (!lunch) {
      return res.status(400).json({
        success: false,
        message: "Lunch not started",
      });
    }

    lunch.end = new Date();
    attendance.status = "clocked_in";

    await attendance.save();

    return res.json({ success: true });
  } catch (err) {
    console.error("Lunch end error:", err);
    return res.status(500).json({ success: false });
  }
}
