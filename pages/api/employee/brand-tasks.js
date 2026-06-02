// GET /api/employee/brand-tasks?brandId=xxx — all tasks for a brand (for Brand Calendar view)
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import "@/models/tasks/Brand";
import "@/models/hr/Employee";

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  try {
    const { brandId, dateStart, dateEnd } = req.query;

    const query = {
      taskType: "production",
      // Only show approved or completed content on the calendar
      $or: [
        { "stages.approved": true },
        { status: "completed" },
      ],
    };
    if (brandId) query.brandId = brandId;
    if (dateStart || dateEnd) {
      const range = {
        ...(dateStart ? { $gte: new Date(dateStart) } : {}),
        ...(dateEnd   ? { $lte: new Date(dateEnd)   } : {}),
      };
      // Combine approval filter with date range using $and so both apply
      query.$and = [
        { $or: query.$or },
        {
          $or: [
            { scheduledFor:      range },
            { dueDate:           range },
            { "stages.deadline": range },
            { "stages.doneAt":   range },
            { submittedAt:       range },
            { updatedAt:         range },
            { createdAt:         range },
          ],
        },
      ];
      delete query.$or;
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "firstName lastName personal")
      .populate("brandId", "name color slug")
      .sort({ scheduledFor: 1, dueDate: 1, createdAt: -1 })
      .limit(500)
      .lean();

    return res.json({ success: true, tasks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
