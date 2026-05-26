import mongoose from "mongoose";

const ClientSchema = new mongoose.Schema(
  {
    clientId: { type: String, unique: true, trim: true },
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone:    { type: String, trim: true },
    company:  { type: String, trim: true },
    address:  { type: String, trim: true },

    password: { type: String, select: false },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],

    notes: { type: String, default: "" },

    inviteToken:       { type: String, select: false },
    inviteTokenExpiry: { type: Date, select: false },
    passwordSet:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.Client || mongoose.model("Client", ClientSchema);
