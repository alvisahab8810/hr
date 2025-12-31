const mongoose = require("mongoose");

const columnWidthSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },  // or sessionId
  widths: {
    type: Map,
    of: Number,  // column widths in pixels
    default: {},
  },
}, { timestamps: true });

export default mongoose.models.ColumnWidth || mongoose.model("ColumnWidth", columnWidthSchema);
