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

  // Build date range filter on scheduledFor or dueDate
  const dateQ = {};
  if (start) dateQ.$gte = start;
  if (end)   dateQ.$lte = end;

  const q = {
    $or: [{ assignedTo: empId }, { "stages.assignedTo": empId }],
  };
  if (start || end) {
    q.$and = [{ $or: [{ scheduledFor: dateQ }, { dueDate: dateQ }] }];
  }

  const [tasks, brands] = await Promise.all([
    Task.find(q)
      .populate("brandId", "name color slug")
      .sort({ dueDate: 1, scheduledFor: 1 })
      .lean(),
    Brand.find({})
      .select("name color weeklySchedule")
      .lean(),
  ]);

  return res.json({ success: true, tasks, brands });
}
