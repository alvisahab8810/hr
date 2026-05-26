// POST - employee: upload attachment to own task

import { createRouter } from "next-connect";
import dbConnect from "@/utils/dbConnect";
import Task from "@/models/tasks/Task";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { logActivity } from "@/utils/tasks/logActivity";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "public/uploads/tasks");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

export const config = { api: { bodyParser: false } };

const router = createRouter();

router.post(upload.array("files"), async (req, res) => {
  try {
    await dbConnect();

    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const { id } = req.query;

    const task = await Task.findOne({ _id: id, assignedTo: employee._id });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (!req.files?.length) return res.status(400).json({ success: false, message: "No files uploaded" });

    const newAttachments = req.files.map((f) => ({
      name:             f.originalname,
      path:             `/uploads/tasks/${f.filename}`,
      uploadedBy:       employee._id,
      uploadedByModel:  "Employee",
      uploadedAt:       new Date(),
    }));

    task.attachments.push(...newAttachments);
    await task.save();

    await logActivity({
      taskId:          id,
      action:          "attachment_added",
      remark:          `${req.files.length} file(s) uploaded`,
      performedById:   employee._id,
      performedByModel: "Employee",
      performedByName: `${employee.firstName} ${employee.lastName}`,
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
