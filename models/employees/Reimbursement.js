import mongoose from "mongoose";

const ReimbursementSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    category: {
      type: String,
      enum: ["Office Expense", "Travel", "Food", "Other"],
      required: true,
    },

    paymentDate: {
      type: Date,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    attachments: {
      type: [String], // file URLs / paths
      default: [],
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Processed"],
      default: "Pending",
    },

    adminRemark: {
      type: String,
      default: "",
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    approvedAt: Date,
    processedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.models.Reimbursement ||
  mongoose.model("Reimbursement", ReimbursementSchema);
