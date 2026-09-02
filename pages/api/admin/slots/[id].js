// pages/api/admin/slots/[id].js — open / block / free one call slot, or remove it.
import dbConnect from "@/utils/dbConnect";
import BookingSlot from "@/models/BookingSlot";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const EMPTY_BOOKING = { name: "", email: "", phone: "", businessName: "", queryId: null };

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  try {
    const slot = await BookingSlot.findById(id);
    if (!slot) return res.status(404).json({ success: false, message: "Slot not found" });

    if (req.method === "PUT") {
      const status = req.body?.status;
      if (!["open", "blocked"].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be open or blocked" });
      }
      // Freeing a booked slot cancels the booking — clear the lead's details
      // with it so the slot doesn't keep showing someone else's name.
      if (slot.status === "booked") {
        slot.booking = EMPTY_BOOKING;
        slot.bookedAt = null;
      }
      slot.status = status;
      await slot.save();
      return res.status(200).json({ success: true, data: slot });
    }

    if (req.method === "DELETE") {
      // A booked slot has a real appointment attached — free it first so the
      // deletion is always a deliberate two-step action.
      if (slot.status === "booked") {
        return res.status(400).json({
          success: false,
          message: "This slot is booked — cancel the booking first, then delete it",
        });
      }
      await slot.deleteOne();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
