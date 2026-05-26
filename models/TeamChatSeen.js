import mongoose from "mongoose";

// Tracks the last time each user opened the community feed
const TeamChatSeenSchema = new mongoose.Schema({
  userId:          { type: mongoose.Schema.Types.ObjectId, required: true },
  userType:        { type: String, enum: ["employee", "admin"], required: true },
  lastSeenAt:      { type: Date, default: () => new Date() },
}, { timestamps: false });

TeamChatSeenSchema.index({ userId: 1, userType: 1 }, { unique: true });

export default mongoose.models.TeamChatSeen ||
  mongoose.model("TeamChatSeen", TeamChatSeenSchema);
