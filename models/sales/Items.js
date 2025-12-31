// pages/models/Item.js
import mongoose from "mongoose";

const ItemSchema = new mongoose.Schema({
  item: String,
  quantity: Number,
  rate: Number,
});

export default mongoose.models.Item || mongoose.model("Item", ItemSchema);
