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

const ReplyToSchema = new mongoose.Schema({
  msgId:      { type: String },
  senderName: { type: String },
  text:       { type: String },
}, { _id: false });

const ReactionSchema = new mongoose.Schema({
  emoji:   { type: String, required: true },
  userIds: { type: [String], default: [] },
}, { _id: false });

const TeamCommunityMessageSchema = new mongoose.Schema({
  senderId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  senderType: { type: String, enum: ["employee", "admin"], required: true },
  senderName: { type: String, required: true },
  senderDept: { type: String, default: "" },
  text:        { type: String, default: "" },
  mentions:    { type: [MentionSchema], default: [] },
  attachments: { type: [AttachmentSchema], default: [] },
  replyTo:     { type: ReplyToSchema, default: null },
  edited:      { type: Boolean, default: false },
  deleted:     { type: Boolean, default: false },
  deletedFor:  { type: [String], default: [] },
  reactions:   { type: [ReactionSchema], default: [] },
}, { timestamps: true });

TeamCommunityMessageSchema.index({ createdAt: -1 });

export default mongoose.models.TeamCommunityMessage ||
  mongoose.model("TeamCommunityMessage", TeamCommunityMessageSchema);
