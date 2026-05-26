import mongoose from "mongoose";

const TaskRequestSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },

    title:       { type: String, required: true, trim: true },
    contentType: { type: String, default: "" },   // e.g. socialMedia, seo, web…
    brief:       { type: String, default: "" },
    needBy:      { type: Date,   default: null },
    priority:    { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    referenceLinks: [{ type: String }],

    // Admin review
    status: {
      type: String,
      enum: ["pending", "in_scope", "out_of_scope"],
      default: "pending",
      index: true,
    },
    adminRemark:  { type: String, default: "" },
    quoteAmount:  { type: Number, default: null },
    reviewedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "AdminUser", default: null },
    reviewedAt:   { type: Date, default: null },

    // Negotiation thread — available to both client and admin after review
    messages: [{
      senderRole: { type: String, enum: ["client", "admin"], required: true },
      senderName: { type: String, default: "" },
      text:       { type: String, required: true },
      sentAt:     { type: Date, default: () => new Date() },
    }],
  },
  { timestamps: true }
);

export default mongoose.models.TaskRequest ||
  mongoose.model("TaskRequest", TaskRequestSchema);
