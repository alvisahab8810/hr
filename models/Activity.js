import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
  employeeEmail: { type: String, required: true },
  url: String,
  title: String,
  timeSpent: Number,
  timestamp: Date,
});

export default mongoose.models.Activity || mongoose.model("Activity", activitySchema);
