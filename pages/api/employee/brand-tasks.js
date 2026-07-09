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

    const query = { taskType: "production" };
    if (brandId) query.brandId = brandId;
    if (dateStart || dateEnd) {
      const ds = dateStart ? new Date(dateStart) : null;
      const de = dateEnd   ? new Date(dateEnd)   : null;

      // Primary: match nomenclature month-year (e.g. "jul'26").
      // This is the definitive content-month marker set when admin creates tasks.
      // Stage deadlines, dueDate, and process timestamps (updatedAt etc.) all span
      // across months and cause past-month tasks to leak into future calendar slots.
      const conditions = [];
      if (ds) {
        const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
        const mAbbr  = MONTHS[ds.getMonth()];
        const yShort = String(ds.getFullYear()).slice(-2);
        conditions.push({ nomenclature: new RegExp(`${mAbbr}'${yShort}`, "i") });
      }
      // Fallback: scheduledFor date (explicit posting date, not a production deadline)
      if (ds || de) {
        const range = { ...(ds ? { $gte: ds } : {}), ...(de ? { $lte: de } : {}) };
        conditions.push({ scheduledFor: range });
      }
      if (conditions.length) query.$or = conditions;
    }

    const tasks = await Task.find(query)
      .populate("assignedTo", "firstName lastName personal")
      .populate("brandId",    "name color slug weeklySchedule")
      .sort({ taskId: 1 })
      .limit(500)
      .lean();

    return res.json({ success: true, tasks });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
