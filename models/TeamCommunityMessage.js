import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
  type: { type: String, enum: ["link", "image"], required: true },
  name: { type: String, required: true },
  url:  { type: String, required: true },
}, { _id: false });

const MentionSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId },
  name:     { type: String },
  userType: { type: String, enum: ["employee", "admin"] },
}, { _id: false });

const TeamCommunityMessageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  senderType: { type: String, enum: ["employee", "admin"], required: true },
  senderName: { type: String, required: true },
  senderDept: { type: String, default: "" },
  text:        { type: String, default: "" },
  mentions:    { type: [MentionSchema], default: [] },
  attachments: { type: [AttachmentSchema], default: [] },
}, { timestamps: true });

TeamCommunityMessageSchema.index({ createdAt: -1 });

export default mongoose.models.TeamCommunityMessage ||
  mongoose.model("TeamCommunityMessage", TeamCommunityMessageSchema);
