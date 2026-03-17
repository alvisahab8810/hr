// models/Holiday.js
import mongoose from "mongoose";

const HolidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Holiday name is required"],
      trim: true,
    },

    // For single-day: startDate === endDate
    // For multi-day:  startDate < endDate
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },

    // Computed and stored so queries are fast
    totalDays: {
      type: Number,
      default: 1,
    },

    type: {
      type: String,
      enum: ["public", "optional", "restricted"],
      default: "public",
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    year: {
      type: Number,
      default: () => new Date().getFullYear(),
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Auto-compute totalDays and year before saving
HolidaySchema.pre("save", function (next) {
  const start = new Date(this.startDate);
  const end   = new Date(this.endDate);
  const diff  = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  this.totalDays = diff > 0 ? diff : 1;
  this.year      = start.getFullYear();
  next();
});

// Same for findOneAndUpdate
HolidaySchema.pre("findOneAndUpdate", function (next) {
  const update = this.getUpdate();
  if (update.startDate || update.endDate) {
    const start = new Date(update.startDate || this._conditions.startDate);
    const end   = new Date(update.endDate   || this._conditions.endDate);
    const diff  = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    this.set({ totalDays: diff > 0 ? diff : 1, year: start.getFullYear() });
  }
  next();
});

export default mongoose.models.Holiday ||
  mongoose.model("Holiday", HolidaySchema);