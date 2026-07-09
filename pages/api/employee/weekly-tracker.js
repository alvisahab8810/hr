// GET /api/employee/weekly-tracker?dateStart=&dateEnd=
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import Brand from "@/models/tasks/Brand";
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
  if (!payload) return res.status(401).json({ success: false });

  await dbConnect();

  const empId = mongoose.Types.ObjectId.isValid(payload.id)
    ? new mongoose.Types.ObjectId(payload.id)
    : payload.id;

  const { dateStart, dateEnd } = req.query;
  const start = dateStart ? new Date(dateStart) : null;
  const end   = dateEnd   ? new Date(dateEnd)   : null;

  // Return ALL SM production tasks for the month so the brand-schedule
  // placement algorithm has the full picture (not just this employee's tasks)
  const q = { taskType: "production" };
  if (start || end) {
    const conditions = [];
    if (start) {
      const MONTHS = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
      const mAbbr  = MONTHS[start.getMonth()];
      const yShort = String(start.getFullYear()).slice(-2);
      conditions.push({ nomenclature: new RegExp(`${mAbbr}'${yShort}`, "i") });
    }
    if (start || end) {
      const range = { ...(start ? { $gte: start } : {}), ...(end ? { $lte: end } : {}) };
      conditions.push({ scheduledFor: range });
    }
    if (conditions.length) q.$or = conditions;
  }

  const [tasks, brands] = await Promise.all([
    Task.find(q)
      .populate("brandId", "name color slug")
      .sort({ taskId: 1 })
      .lean(),
    // Fetch brands separately (same as admin weekly tracker) with full weeklySchedule
    Brand.find({ services: { $in: ["socialMedia"] } })
      .select("_id name color weeklySchedule monthlyDeliverables")
      .lean(),
  ]);

  return res.json({ success: true, tasks, brands });
}
