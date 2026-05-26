// POST   - upload attachment(s) to a task
// DELETE - remove an attachment by attachment _id

import { createRouter } from "next-connect";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import { logActivity } from "@/utils/tasks/logActivity";
import multer from "multer";
import path from "path";
import fs from "fs";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const uploadDir = path.join(process.cwd(), "public/uploads/tasks");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

export const config = { api: { bodyParser: false } };

const router = createRouter();

router.use((req, res, next) => {
  if (!adminGuard(req, res)) return;
  next();
});

/* ── POST: upload ── */
router.post(upload.array("files"), async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.query;
    const { uploadedById, uploadedByModel = "AdminUser", uploadedByName = "Admin" } = req.body;

    if (!req.files?.length) return res.status(400).json({ success: false, message: "No files uploaded" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const newAttachments = req.files.map((f) => ({
      name:             f.originalname,
      path:             `/uploads/tasks/${f.filename}`,
      uploadedBy:       uploadedById || null,
      uploadedByModel,
      uploadedAt:       new Date(),
    }));

    task.attachments.push(...newAttachments);
    await task.save();

    await logActivity({
      taskId:          id,
      action:          "attachment_added",
      remark:          `${req.files.length} file(s) uploaded`,
      performedById:   uploadedById,
      performedByModel: uploadedByModel,
      performedByName: uploadedByName,
    });

    return res.json({ success: true, attachments: task.attachments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/* ── DELETE: remove one attachment ── */
router.delete(async (req, res) => {
  try {
    await dbConnect();
    const { id } = req.query;
    const { attachmentId, performedById, performedByModel = "AdminUser", performedByName = "Admin" } = req.body;

    if (!attachmentId) return res.status(400).json({ success: false, message: "attachmentId is required" });

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    const attachment = task.attachments.id(attachmentId);
    if (!attachment) return res.status(404).json({ success: false, message: "Attachment not found" });

    // Remove file from disk
    const filePath = path.join(process.cwd(), "public", attachment.path);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    task.attachments.pull(attachmentId);
    await task.save();

    await logActivity({
      taskId:          id,
      action:          "attachment_removed",
      remark:          `File "${attachment.name}" removed`,
      performedById,
      performedByModel,
      performedByName,
    });

    return res.json({ success: true, attachments: task.attachments });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

export default router.handler({
  onError(err, req, res) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload error" });
  },
  onNoMatch(req, res) {
    res.status(405).json({ success: false });
  },
});
