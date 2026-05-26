// GET - task analytics: status breakdown, priority breakdown, overdue count,
//       workload per employee, completion rate

import dbConnect from "@/utils/dbConnect";
import Task     from "@/models/tasks/Task";
import Brand    from "@/models/tasks/Brand";
import Employee from "@/models/hr/Employee";
import Project  from "@/models/projects/Project";
import Sprint   from "@/models/projects/Sprint";
import Client   from "@/models/clients/Client";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    const now = new Date();
    const { projectId, sprintId } = req.query;

    const baseQuery = {};
    if (projectId) baseQuery.projectId = projectId;
    if (sprintId)  baseQuery.sprintId  = sprintId;

    const [
      total,
      byStatus,
      byPriority,
      byType,
      overdue,
      workload,
      completedThisMonth,
    ] = await Promise.all([
      Task.countDocuments(baseQuery),

      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$priority", count: { $sum: 1 } } },
      ]),

      Task.aggregate([
        { $match: baseQuery },
        { $group: { _id: "$taskType", count: { $sum: 1 } } },
      ]),

      Task.countDocuments({
        ...baseQuery,
        dueDate: { $lt: now },
        status:  { $nin: ["completed"] },
      }),

      Task.aggregate([
        { $match: { ...baseQuery, assignedTo: { $ne: null } } },
        {
          $group: {
            _id:   "$assignedTo",
            total: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] },
            },
            overdue: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $lt: ["$dueDate", now] },
                      { $ne: ["$status", "completed"] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
        {
          $lookup: {
            from:         "employees",
            localField:   "_id",
            foreignField: "_id",
            as:           "employee",
          },
        },
        { $unwind: { path: "$employee", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            total: 1,
            completed: 1,
            inProgress: 1,
            overdue: 1,
            employeeName: {
              $concat: [
                { $ifNull: ["$employee.firstName", ""] },
                " ",
                { $ifNull: ["$employee.lastName", ""] },
              ],
            },
          },
        },
        { $sort: { total: -1 } },
      ]),

      Task.countDocuments({
        ...baseQuery,
        status: "completed",
        updatedAt: {
          $gte: new Date(now.getFullYear(), now.getMonth(), 1),
          $lte: now,
        },
      }),
    ]);

    const completed = byStatus.find((s) => s._id === "completed")?.count || 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return res.json({
      success: true,
      stats: {
        total,
        overdue,
        completedThisMonth,
        completionRate,
        byStatus,
        byPriority,
        byType,
        workload,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
