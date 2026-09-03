// pages/api/admin/leads/[id]/book.js — book (or free) a call slot for a lead
// from inside the CRM, e.g. after the team calls them and fixes a time.
// Uses the same guarded update as the website so two people can never take the
// same slot: status:"open" in the filter is the lock.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import BookingSlot from "@/models/BookingSlot";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";
import { prettyDate, prettyTime } from "@/utils/leadMail";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad lead id" });
  }

  // A salesperson only reaches their own leads.
  if (!(await ownsLead(req, res, id))) return;

  try {
    const lead = await Query.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    /* ── Free the current slot ─────────────────────────────────────────── */
    if (req.body?.release) {
      if (lead.slotId) {
        await BookingSlot.findByIdAndUpdate(lead.slotId, {
          $set: { status: "open", bookedAt: null, booking: {} },
        }).catch(() => {});
      }
      const saved = await Query.findByIdAndUpdate(
        id,
        {
          $set: { slotDate: "", slotTime: "", slotId: null, held: "" },
          $push: { events: { at: new Date(), type: "meeting", text: "Call slot cancelled" } },
        },
        { new: true }
      ).lean();
      return res.status(200).json({ success: true, data: { ...saved, _id: String(saved._id) } });
    }

    /* ── Claim a new slot ──────────────────────────────────────────────── */
    const { slotId } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(slotId)) {
      return res.status(400).json({ success: false, message: "Pick a slot" });
    }

    const slot = await BookingSlot.findOneAndUpdate(
      { _id: slotId, status: "open" },
      {
        $set: {
          status: "booked",
          bookedAt: new Date(),
          booking: {
            name: lead.name || "",
            email: lead.email || "",
            phone: lead.phone || "",
            businessName: lead.businessName || "",
            queryId: lead._id,
          },
        },
      },
      { new: true }
    );

    if (!slot) {
      return res.status(409).json({
        success: false,
        code: "TAKEN",
        message: "That slot was just taken — pick another one.",
      });
    }

    // Whatever they had before is free again.
    if (lead.slotId && String(lead.slotId) !== String(slot._id)) {
      await BookingSlot.findByIdAndUpdate(lead.slotId, {
        $set: { status: "open", bookedAt: null, booking: {} },
      }).catch(() => {});
    }

    const saved = await Query.findByIdAndUpdate(
      id,
      {
        $set: {
          slotDate: slot.date,
          slotTime: slot.time,
          slotId: slot._id,
          held: "",
          status: ["Won", "Lost", "Not qualified"].includes(lead.status) ? lead.status : "Meeting booked",
        },
        $push: {
          events: {
            at: new Date(),
            type: "meeting",
            text: `Call booked for ${prettyDate(slot.date)} at ${prettyTime(slot.time)}`,
          },
        },
      },
      { new: true }
    ).lean();

    return res.status(200).json({ success: true, data: { ...saved, _id: String(saved._id) } });
  } catch (error) {
    console.error("lead book:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
