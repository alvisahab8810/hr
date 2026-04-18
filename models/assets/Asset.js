import mongoose from "mongoose";

const AssetSchema = new mongoose.Schema(
  {
    assetId:       { type: String, unique: true },
    name:          { type: String, required: true, trim: true },
    category:      { type: String, enum: ["Electronics","Furniture","Accessories","Equipment","Vehicles","Other"], required: true },
    brand:         String,
    model:         String,
    serialNumber:  String,
    purchaseDate:  Date,
    purchaseValue: Number,
    warrantyExpiry:Date,
    vendor:        String,
    location:      String,   // office location e.g. "Meeting Room A"
    quantity:      { type: Number, default: 1 },
    condition:     { type: String, enum: ["Good","Fair","Damaged","Under Repair"], default: "Good" },
    status:        { type: String, enum: ["Available","Assigned","Retired"], default: "Available" },
    assignedTo:    { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    assignedDate:  Date,
    lastReturnDate:Date,
    remarks:       String,
  },
  { timestamps: true }
);

export default mongoose.models.Asset || mongoose.model("Asset", AssetSchema);
