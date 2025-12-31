import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true, // e.g., "Independence Day"
    },
    date: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    isOptional: {
      type: Boolean,
      default: false, // For optional holidays like festival leave
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Holiday ||
  mongoose.model("Holiday", HolidaySchema);
