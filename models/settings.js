import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    terms: {
      type: String,
      required: true,
    },
    customerNotes: {
      type: String,
      required: true, // or false if optional
    },
  },
  { timestamps: true }
);

const Settings = mongoose.models.Settings || mongoose.model("Settings", settingsSchema);
export default Settings;
