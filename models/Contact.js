import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    phone: String,
    businessName: {
      type: String,
      required: true,
    },
    formType: {
      type: String,
      default: "Contact Us",
    },

        // NEW field ↓
    salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
 customFields: {
    type: Map,
    of: String,
    default: {},
  },

  },
  { timestamps: true }
);

export default mongoose.models.Contact || mongoose.model("Contact", ContactSchema);
