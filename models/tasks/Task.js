import mongoose from "mongoose";

const StageEntrySchema = new mongoose.Schema({
  name:         { type: String, default: "" },
  assignedTo:   [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
  deadline:     { type: Date, default: null },
  done:         { type: Boolean, default: false },
  doneAt:       { type: Date, default: null },
  approved:     { type: Boolean, default: false },
  rejected:     { type: Boolean, default: false },
  rejectReason: { type: String, default: "" },
  proofUrls:    { type: [String], default: [] },
  doneNote:     { type: String, default: "" },
}, { _id: false });

const AttachmentSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true },
    path:       { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, refPath: "attachments.uploadedByModel" },
    uploadedByModel: { type: String, enum: ["AdminUser", "Employee"], default: "Employee" },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    taskType: {
      type: String,
      enum: ["project", "sprint", "production", "manual"],
      required: true,
    },

    status: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed", "blocked"],
      default: "todo",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "assignedByModel",
      default: null,
    },
    assignedByModel: {
      type: String,
      enum: ["AdminUser", "Employee"],
      default: "AdminUser",
    },

    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },

    sprintId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sprint",
      default: null,
    },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    dueDate: { type: Date, default: null },

    attachments: { type: [AttachmentSchema], default: [] },

    tags: { type: [String], default: [] },

    estimatedHours: { type: Number, default: null },
    loggedHours:    { type: Number, default: 0 },

    /* ── Content / Social Media fields ── */
    brandId: { type: mongoose.Schema.Types.ObjectId, ref: "Brand", default: null },
    contentType: { type: String, enum: ["reel", "post", "carousel", "story", ""], default: "" },
    stage: { type: String, enum: ["S1", "S2", "S3", "S4", ""], default: "" },
    nomenclature: { type: String, default: "" }, // auto-name: "reel1 may'26"
    caption:      { type: String, default: "" },
    referenceLink: { type: String, default: "" },
    pillar:       { type: String, default: "" },
    seoCategory: { type: String, enum: ["blog","technical","onpage","offpage","backlinks","keywords",""], default: "" },
    reviewNote:       { type: String, default: "" },
    submittedAt:      { type: Date, default: null },
    postedAt:         { type: Date, default: null },
    scheduledFor:     { type: Date, default: null },

    /* ── Dev / project task fields ── */
    workReport:       { type: String, default: "" },   // employee update when submitting for review
    proofLink:        { type: String, default: "" },   // staging URL or demo link
    clientReviewNote: { type: String, default: "" },   // client feedback when rejecting

    /* ── Per-stage assignments & deadlines (production tasks) ── */
    stages: { type: [StageEntrySchema], default: [] },

    /* ── Human-readable task ID (brand-wise serial: CO001, TO002, …) ── */
    taskId: { type: String, default: "" },
  },
  { timestamps: true }
);

TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ projectId: 1 });
TaskSchema.index({ sprintId: 1 });
TaskSchema.index({ dueDate: 1 });
TaskSchema.index({ status: 1, priority: 1 });
TaskSchema.index({ brandId: 1, stage: 1 });
TaskSchema.index({ brandId: 1, contentType: 1, createdAt: -1 });
TaskSchema.index({ taskId: 1 }, { unique: true, sparse: true });

/* Clear cached model so schema changes take effect on hot reload */
delete mongoose.models["Task"];
export default mongoose.model("Task", TaskSchema);
