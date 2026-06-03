import mongoose from "mongoose";
const S = mongoose.Schema;

const schema = new S({
  brandId:       { type: S.Types.ObjectId, ref: "Brand", required: true, index: true },
  clientId:      { type: S.Types.ObjectId, ref: "Client", required: true },
  clientName:    { type: String, default: "" },
  brandName:     { type: String, default: "" },
  brandSlug:     { type: String, default: "" },
  preferredDate: { type: String, required: true },
  preferredTime: { type: String, required: true },
  note:          { type: String, default: "" },
  requestType:   { type: String, enum: ["call", "meeting"], default: "call" },
  meetingLink:   { type: String, default: "" },
  status:        { type: String, enum: ["pending", "approved", "rejected", "scheduled"], default: "pending" },
  scheduledDate: { type: String, default: "" },
  scheduledTime: { type: String, default: "" },
  adminNote:     { type: String, default: "" },
}, { timestamps: true });

export default mongoose.models.CallRequest || mongoose.model("CallRequest", schema);
