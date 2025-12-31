import mongoose from "mongoose";

const querySchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    businessName: String,
    formType: {
  type: String,
  default: "Query Form",
},
 salespersonId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

 customFields: {
    type: Map,
    of: String,
    default: {},
  },

  },
  { timestamps: true }

  
);

export default mongoose.models.Query || mongoose.model("Query", querySchema);
