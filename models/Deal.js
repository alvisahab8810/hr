import mongoose from "mongoose";

const dealSchema = new mongoose.Schema(
  {
    title: String,
    amount: Number,
    status: { type: String, enum: ["open", "finalized"], default: "open" },
    salesperson: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedDate: Date,
  },
  { timestamps: true }
);

export default mongoose.models.Deal || mongoose.model("Deal", dealSchema);
