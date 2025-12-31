// models/Announcement.js
import mongoose from "mongoose";

const AnnouncementSchema = new mongoose.Schema({
  title: { type: String, required: true },
  message: { type: String, required: true }, // store HTML/Rich text
  priority: { type: String, enum: ["normal", "high"], default: "normal" },
  audience: {
    type: [String], // e.g. ["all", "hr", "finance", "employees"]
    default: ["all"],
  },
  attachments: [{ type: String }], // file URLs
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Announcement ||
  mongoose.model("Announcement", AnnouncementSchema);
