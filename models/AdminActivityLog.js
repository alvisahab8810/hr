import mongoose from "mongoose";

const AdminActivityLogSchema = new mongoose.Schema(
  {
    adminUserId:   { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", required: true, index: true },
    adminUserName: { type: String, required: true },
    adminUserRole: { type: String, default: "" },
    action:        { type: String, required: true },
    category:      { type: String, enum: ["task", "leave", "overtime", "reimbursement", "employee", "other"], default: "task" },
    description:   { type: String, required: true },
    metadata: {
      taskId:       { type: mongoose.Schema.Types.ObjectId },
      taskTitle:    { type: String },
      employeeName: { type: String },
      employeeId:   { type: mongoose.Schema.Types.ObjectId },
      fromValue:    { type: String },
      toValue:      { type: String },
    },
  },
  { timestamps: true }
);

export default mongoose.models.AdminActivityLog ||
  mongoose.model("AdminActivityLog", AdminActivityLogSchema);
