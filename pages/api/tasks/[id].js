// GET - employee: get single task detail (only own tasks)

import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import TaskComment  from "@/models/tasks/TaskComment";
import TaskActivity from "@/models/tasks/TaskActivity";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  try {
    const { id } = req.query;

    const task = await Task.findOne({ _id: id, assignedTo: employee._id })
      .populate("assignedBy", "name firstName lastName")
      .populate("projectId",  "name status")
      .populate("sprintId",   "name status")
      .populate("clientId",   "name company")
      .lean();

    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const [comments, activity] = await Promise.all([
      TaskComment.find({ taskId: id }).sort({ createdAt: 1 }).lean(),
      TaskActivity.find({ taskId: id }).sort({ createdAt: 1 }).lean(),
    ]);

    return res.json({ success: true, task, comments, activity });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
