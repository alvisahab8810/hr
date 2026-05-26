import mongoose from "mongoose";

const AttachmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  url:  { type: String, required: true },
}, { _id: false });

const ClientMessageSchema = new mongoose.Schema({
  brandId:     { type: mongoose.Schema.Types.ObjectId, ref: "Brand", required: true, index: true },
  senderRole:  { type: String, enum: ["client", "team"], required: true },
  senderName:  { type: String, required: true },
  senderId:    { type: mongoose.Schema.Types.ObjectId },
  text:        { type: String, default: "" },
  attachments: { type: [AttachmentSchema], default: [] },
  readByTeam:  { type: Boolean, default: false },
  readByClient:{ type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.ClientMessage ||
  mongoose.model("ClientMessage", ClientMessageSchema);
