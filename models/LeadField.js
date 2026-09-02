// models/LeadField.js — the extra columns the team adds to the Leads table
// themselves (payroll → Website → Leads → "Add column"). The definition lives
// here; the value for each lead lives in Query.customFields[key].
import mongoose from "mongoose";

const LeadFieldSchema = new mongoose.Schema(
  {
    // Slug used as the customFields map key — "gst_number".
    key:   { type: String, required: true, unique: true },
    label: { type: String, required: true },
    type:  { type: String, enum: ["text", "number", "date", "select"], default: "text" },
    // Only for type "select".
    options: { type: [String], default: [] },
    order:   { type: Number, default: 0 },
  },
  { timestamps: true }
);

if (process.env.NODE_ENV !== "production" && mongoose.models.LeadField) {
  delete mongoose.models.LeadField;
}

export default mongoose.models.LeadField || mongoose.model("LeadField", LeadFieldSchema);
