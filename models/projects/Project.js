import mongoose from "mongoose";

const ProjectSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "on_hold", "completed", "cancelled"],
      default: "active",
    },

    startDate: { type: Date, default: null },
    endDate:   { type: Date, default: null },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "createdByModel",
    },
    createdByModel: {
      type: String,
      enum: ["AdminUser", "Employee"],
      default: "AdminUser",
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },

    currentPhase: {
      type: String,
      enum: ["uiux", "development", "testing", "launch", "completed"],
      default: "development",
    },

    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],

    phaseTeams: {
      type: [{
        phase: { type: String, enum: ["uiux", "development", "testing", "launch"] },
        members: [{ type: mongoose.Schema.Types.ObjectId, ref: "Employee" }],
        _id: false,
      }],
      default: [],
    },

    tags:   { type: [String], default: [] },
    budget: { type: Number, default: null },
  },
  { timestamps: true }
);

export default mongoose.models.Project || mongoose.model("Project", ProjectSchema);
