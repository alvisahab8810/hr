import mongoose from "mongoose";

const PersonalDevelopmentGradeSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    month: { type: Number, required: true }, // 0–11
    year:  { type: Number, required: true },

    score: { type: Number, required: true, min: 0, max: 5 },
    note:  { type: String, default: "", trim: true },

    setBy: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
    setAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PersonalDevelopmentGradeSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });

export default mongoose.models.PersonalDevelopmentGrade ||
  mongoose.model("PersonalDevelopmentGrade", PersonalDevelopmentGradeSchema);
