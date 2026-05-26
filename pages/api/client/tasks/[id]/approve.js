// POST /api/client/tasks/[id]/approve  — client approves or rejects a task
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import Brand from "@/models/tasks/Brand";

function getToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const payload = getToken(req);
  if (!payload || payload.role !== "client") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();

  try {
    const { id } = req.query;
    const { action, note } = req.body; // action: "approve" | "feedback"

    const task = await Task.findById(id).populate("brandId");
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const brand = await Brand.findById(task.brandId);
    if (!brand || !brand.clientId || brand.clientId.toString() !== payload.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Allow approve/feedback on tasks explicitly in review, or production tasks stuck
    // at in_progress because admin approved a stage with the old buggy code
    const isReviewable = task.status === "review" || (() => {
      if (task.taskType !== "production" || task.status !== "in_progress") return false;
      const stageNum  = task.stage ? parseInt(task.stage.replace("S","")) : 1;
      if (stageNum < 2) return false;
      const activeIdx = stageNum - 1;
      const curStage  = task.stages?.[activeIdx];
      const prevStage = task.stages?.[activeIdx - 1];
      return !curStage?.assignedTo?.length && prevStage?.done && prevStage?.approved;
    })();
    if (!isReviewable) {
      return res.status(400).json({ success: false, message: "Task is not awaiting review" });
    }

    let update;
    if (action === "approve") {
      update = { status: "completed", reviewNote: note || "", postedAt: new Date() };
    } else {
      // Client gave feedback — find the last done stage and reset it so employee can resubmit
      const stages = task.stages || [];
      let resetIdx = -1;
      for (let i = stages.length - 1; i >= 0; i--) {
        if (stages[i].done) { resetIdx = i; break; }
      }
      update = { status: "todo", reviewNote: note || "" };
      if (resetIdx >= 0) {
        update[`stages.${resetIdx}.done`]     = false;
        update[`stages.${resetIdx}.approved`] = false;
        update[`stages.${resetIdx}.doneAt`]   = null;
        update.stage = `S${resetIdx + 1}`;
      }
    }

    const updated = await Task.findByIdAndUpdate(id, { $set: update }, { new: true })
      .populate("brandId", "name color slug")
      .lean();

    return res.json({ success: true, task: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
