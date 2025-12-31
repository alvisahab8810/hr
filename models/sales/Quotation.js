import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({


  item: String,
  quantity: Number,
  rate: Number,
  amount: Number, // optional, we can derive it too
});

const quotationSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  quoteNumber: { type: String, required: true },
  referenceNumber: { type: String },
  quoteDate: { type: Date },
  expiryDate: { type: Date },
  subject: { type: String },

  items: [itemSchema],

  subtotal: Number,
  discount: Number, // %
  gst: Number, // %
  adjustment: Number,
  total: Number,

  customerNotes: String,
  terms: String,

  attachedFiles: [String], // store file URLs or paths

   // ✅ New status field
  status: {
    type: String,
    enum: ["Sent", "Approved", "Rejected", "Pending"],
    default: "Sent",
  },
},
{
  timestamps: true // ✅ enables createdAt and updatedAt auto

  // createdAt: { type: Date, default: Date.now },
  
});

// export default mongoose.models.Quotation || mongoose.model('Quotation', quotationSchema);

delete mongoose.models.Quotation; // 💥 Force schema to recompile with timestamps
export default mongoose.model('Quotation', quotationSchema);
