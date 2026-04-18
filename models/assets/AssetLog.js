import mongoose from "mongoose";

const AssetLogSchema = new mongoose.Schema(
  {
    asset:        { type: mongoose.Schema.Types.ObjectId, ref: "Asset", required: true },
    assetName:    String,
    assetId:      String,
    action:       { type: String, enum: ["Created","Assigned","Returned","Updated","Damage Reported","Retired","Reassigned"], required: true },
    fromEmployee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    toEmployee:   { type: mongoose.Schema.Types.ObjectId, ref: "Employee" },
    performedBy:  { type: String, default: "Admin" },
    notes:        String,
  },
  { timestamps: true }
);

export default mongoose.models.AssetLog || mongoose.model("AssetLog", AssetLogSchema);
