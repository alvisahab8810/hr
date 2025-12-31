import mongoose from "mongoose";

// const LeaveBalanceSchema = new mongoose.Schema(
//   {
//     employee: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Employee",
//       required: true,
//       unique: true,
//     },

//     year: {
//       type: Number,
//       required: true,
//     },

//     sick: {
//       total: { type: Number, default: 10 },
//       used: { type: Number, default: 0 },
//     },

//     earned: {
//       total: { type: Number, default: 20 },
//       used: { type: Number, default: 0 },
//     },
//   },
//   { timestamps: true }
// );


const LeaveBalanceSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    year: {
      type: Number,
      required: true,
    },

    sick: {
      total: { type: Number, default: 10 },
      used: { type: Number, default: 0 },
    },

    earned: {
      total: { type: Number, default: 20 },
      used: { type: Number, default: 0 },
    },

    
  },
  { timestamps: true }
);

// ✅ composite unique index
LeaveBalanceSchema.index({ employee: 1, year: 1 }, { unique: true });


export default mongoose.models.LeaveBalance ||
  mongoose.model("LeaveBalance", LeaveBalanceSchema);
