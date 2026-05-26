import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
  type: { type: String, enum: ["link", "image"], required: true },
  name: { type: String, required: true },
  url:  { type: String, required: true },
}, { _id: false });

const TeamDMMessageSchema = new mongoose.Schema({
  // admin + employee pair identifies the thread
  adminId:     { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  employeeId:  { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  senderId:    { type: mongoose.Schema.Types.ObjectId, required: true },
  senderType:  { type: String, enum: ["admin", "employee"], required: true },
  senderName:  { type: String, required: true },
  text:        { type: String, default: "" },
  attachments: { type: [AttachmentSchema], default: [] },
  readByEmployee: { type: Boolean, default: false },
  readByAdmin:    { type: Boolean, default: true },
}, { timestamps: true });

TeamDMMessageSchema.index({ adminId: 1, employeeId: 1, createdAt: -1 });

export default mongoose.models.TeamDMMessage ||
  mongoose.model("TeamDMMessage", TeamDMMessageSchema);
