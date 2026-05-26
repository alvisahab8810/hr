// GET - employee: get my tasks with filters and pagination

import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  try {
    const {
      status,
      priority,
      taskType,
      projectId,
      sprintId,
      search,
      overdue,
      dueSoon, // tasks due in next 3 days
      page  = 1,
      limit = 20,
    } = req.query;

    const q = { assignedTo: employee._id };

    if (status)   q.status   = status;
    if (priority) q.priority = priority;
    if (taskType) q.taskType = taskType;
    if (projectId) q.projectId = projectId;
    if (sprintId)  q.sprintId  = sprintId;

    const now = new Date();

    if (overdue === "true") {
      q.dueDate = { $lt: now };
      q.status  = { $nin: ["completed"] };
    }

    if (dueSoon === "true") {
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      q.dueDate = { $gte: now, $lte: threeDays };
      q.status  = { $nin: ["completed"] };
    }

    if (search) {
      q.$or = [
        { title:       { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const total = await Task.countDocuments(q);

    const tasks = await Task.find(q)
      .populate("assignedBy", "name firstName lastName")
      .populate("projectId",  "name status")
      .populate("sprintId",   "name status")
      .populate("clientId",   "name company")
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    // Dashboard counts (always for this employee)
    const [todayCount, upcomingCount, overdueCount, completedCount] = await Promise.all([
      Task.countDocuments({
        assignedTo: employee._id,
        dueDate: {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999)),
        },
        status: { $nin: ["completed"] },
      }),
      Task.countDocuments({
        assignedTo: employee._id,
        dueDate: { $gt: new Date() },
        status:  { $nin: ["completed"] },
      }),
      Task.countDocuments({
        assignedTo: employee._id,
        dueDate: { $lt: new Date() },
        status:  { $nin: ["completed"] },
      }),
      Task.countDocuments({ assignedTo: employee._id, status: "completed" }),
    ]);

    return res.json({
      success: true,
      tasks,
      counts: { todayCount, upcomingCount, overdueCount, completedCount },
      pagination: {
        total,
        page:  Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
