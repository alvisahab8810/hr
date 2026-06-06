// POST /api/employee/stage-submit — mark current stage done + advance task stage
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import "@/models/tasks/Brand";
import "@/models/hr/Employee";
import { emitTaskEvent } from "@/utils/tasks/emitTaskEvent";

function verifyToken(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

const NEXT_STAGE = { S1: "S2", S2: "S3", S3: "S4", S4: "S4" };
const STAGE_IDX  = { S1: 0, S2: 1, S3: 2, S4: 3 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false, message: "Unauthorized" });

  await dbConnect();

  try {
    const { taskId, proofUrl, notes, stageKey } = req.body;
    if (!taskId) return res.status(400).json({ success: false, message: "taskId required" });

    const empId = mongoose.Types.ObjectId.isValid(payload.id)
      ? new mongoose.Types.ObjectId(payload.id)
      : payload.id;

    const task = await Task.findOne({
      _id: taskId,
      $or: [{ assignedTo: empId }, { "stages.assignedTo": empId }],
    });
    if (!task) return res.status(404).json({ success: false, message: "Task not found or not assigned to you" });

    // Use the stage the employee is explicitly submitting, fallback to task.stage
    const curStage   = (stageKey && STAGE_IDX[stageKey] !== undefined) ? stageKey : (task.stage || "S1");
    const stageIdx   = STAGE_IDX[curStage] ?? 0;
    const nextStage  = NEXT_STAGE[curStage] || curStage;
    const taskCurIdx = STAGE_IDX[task.stage || "S1"] ?? 0;
    const isActiveStage = stageIdx === taskCurIdx;

    // S2/S3/S4 cannot submit until admin has approved S1 (Script/Concept)
    if (curStage !== "S1" && task.stages?.[0]?.approved !== true) {
      return res.status(403).json({ success: false, message: "S1 (Script/Concept) must be approved by admin before you can submit this stage." });
    }

    const existingUrls = task.stages?.[stageIdx]?.proofUrls || [];
    const newUrls      = proofUrl?.trim() ? [...existingUrls, proofUrl.trim()] : existingUrls;

    // Determine the next status when advancing:
    // • S1 (Content/Script) → always in_progress, never goes directly to client
    // • S2 (Shoot) → always in_progress; S3 (Edit) still needs to be done
    // • S3 (Edit) done → review (client approval, next is S4/Posted)
    let newStatus = "in_progress";
    if (isActiveStage) {
      if (curStage === "S1") {
        newStatus = "in_progress";
      } else if (nextStage === "S4") {
        // S3 editing done → goes to client review
        newStatus = "review";
      } else {
        // S2 submitted → S3 still needs editing, always in_progress
        newStatus = "in_progress";
      }
    }

    const setFields = {
      [`stages.${stageIdx}.done`]:      true,
      [`stages.${stageIdx}.doneAt`]:    new Date(),
      [`stages.${stageIdx}.proofUrls`]: newUrls,
      [`stages.${stageIdx}.rejected`]:  false,
      ...(notes?.trim() ? { [`stages.${stageIdx}.doneNote`]: notes.trim() } : {}),
      ...(isActiveStage ? { stage: nextStage, status: newStatus } : {}),
    };

    const updated = await Task.findByIdAndUpdate(taskId, { $set: setFields }, { new: true })
      .populate("brandId",    "name color slug")
      .populate("assignedTo", "firstName lastName personal")
      .lean();

    emitTaskEvent("task:updated", { taskId: taskId, employeeIds: [String(empId)] });
    return res.json({ success: true, task: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
