import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: Object, required: true },
    image: { type: String, default: "" },
    postType: { type: String, enum: ["DRAFT", "PUBLISHED"], default: "DRAFT" },
  },
  { timestamps: true }
);

export default mongoose.models.Post || mongoose.model("Post", PostSchema);
