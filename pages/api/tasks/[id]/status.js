// PATCH - employee: update task status (only own tasks)

import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { logActivity } from "@/utils/tasks/logActivity";

const VALID_STATUSES = ["todo", "in_progress", "review", "completed", "blocked"];

export default async function handler(req, res) {
  if (req.method !== "PATCH") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  try {
    const { id }    = req.query;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const task = await Task.findOne({ _id: id, assignedTo: employee._id });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const prevStatus = task.status;
    task.status = status;
    await task.save();

    await logActivity({
      taskId:          id,
      action:          status === "completed" ? "completed" : status === "blocked" ? "blocked" : "status_changed",
      from:            prevStatus,
      to:              status,
      performedById:   employee._id,
      performedByModel: "Employee",
      performedByName: `${employee.firstName} ${employee.lastName}`,
    });

    return res.json({ success: true, task });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
