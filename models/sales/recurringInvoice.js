import mongoose from "mongoose";

const recurringInvoiceSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: "Customer", required: true },
  customerEmail: { type: String, required: true }, // ✅ ADD THIS LINE
  invoiceNumber: String,
  referenceNumber: String,
  invoiceDate: Date,
  dueDate: Date,
  subject: String,
  items: [
    {
      item: String,
      quantity: Number,
      rate: Number,
      amount: Number,
    },
  ],
  subtotal: Number,
  discount: Number,
  gst: Number,
  total: Number,
  customerNotes: String,
  terms: String,
  sacCode: String,
  
 // 🆕 ADD THIS
  previewHTML: String,
  
  // Recurring fields
  recurringType: { type: String, enum: ["daily", "weekly", "monthly", "yearly"], required: true },
  repeatEvery: { type: Number, required: true },
  endDate: { type: Date, required: true },
});

export default mongoose.models.RecurringInvoice ||
  mongoose.model("RecurringInvoice", recurringInvoiceSchema);
