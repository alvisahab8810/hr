// models/BookingSlot.js — call slots for the website's "Ready to collaborate"
// booking form. The admin opens slots month by month (payroll → Website →
// Slots); the website lists the open ones and books them.
// IMPORTANT: keep this schema identical to viralon-new/models/BookingSlot.js —
// both apps share the same Mongo "bookingslots" collection (payroll writes the
// schedule, the website books against it).

import mongoose from "mongoose";

const BookingSlotSchema = new mongoose.Schema(
  {
    // "2026-08-31" — a plain date string, so nothing shifts across timezones.
    date: { type: String, required: true },
    // "16:30" — 24h clock, IST.
    time: { type: String, required: true },

    // open    → shown and bookable on the site
    // booked  → taken by a lead, shown greyed out
    // blocked → admin closed it manually, hidden from the site
    status: { type: String, enum: ["open", "booked", "blocked"], default: "open" },

    // Filled in when a lead books it.
    booking: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      businessName: { type: String, default: "" },
      queryId: { type: mongoose.Schema.Types.ObjectId, ref: "Query" },
    },
    bookedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One slot per date+time, so a double booking can never be created.
BookingSlotSchema.index({ date: 1, time: 1 }, { unique: true });

if (process.env.NODE_ENV !== "production" && mongoose.models.BookingSlot) {
  delete mongoose.models.BookingSlot;
}

export default mongoose.models.BookingSlot || mongoose.model("BookingSlot", BookingSlotSchema);
