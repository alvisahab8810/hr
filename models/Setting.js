// models/Setting.js — one document holds the whole CRM configuration.
// A single row keyed "crm": the picklists, the document branding and the
// document defaults. Everything the Settings page writes lands here, and the
// boards read it back through /api/admin/settings.
import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema(
  {
    key:  { type: String, required: true, unique: true, default: "crm" },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: "crmsettings" }
);

export default mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
