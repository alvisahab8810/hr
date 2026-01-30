import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ Unified auth
    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const {
      project,
      date,
      otType,
      startTime,
      endTime,
      reason,
      tasks,
    } = req.body;

    // 🔒 Validation
    if (
      !project ||
      !date ||
      !otType ||
      !startTime ||
      !endTime ||
      !reason ||
      !tasks
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: "End time must be after start time",
      });
    }

    const overtime = await Overtime.create({
      employee: employee._id,
      project,
      date,
      otType,
      startTime,
      endTime,
      reason,
      tasks,
      status: "Pending",
    });

    return res.status(201).json({
      success: true,
      overtime,
    });
  } catch (err) {
    console.error("Create overtime error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error" });
  }
}
