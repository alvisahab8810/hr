// pages/api/payroll/holidays/[id].js
import dbConnect from "@/utils/dbConnect";
import Holiday from "@/models/Holiday";

export default async function handler(req, res) {
  await dbConnect();
  const { id } = req.query;

  // PUT /api/payroll/holidays/:id
  if (req.method === "PUT") {
    try {
      const { name, startDate, endDate, type, description } = req.body;

      if (!name || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "name, startDate and endDate are required",
        });
      }

      if (new Date(endDate) < new Date(startDate)) {
        return res.status(400).json({
          success: false,
          message: "endDate cannot be before startDate",
        });
      }

      // Recompute totalDays and year manually since pre hook only runs on save()
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const totalDays = diff > 0 ? diff : 1;
      const year = start.getFullYear();

      const updated = await Holiday.findByIdAndUpdate(
        id,
        {
          name,
          startDate: start,
          endDate: end,
          totalDays,
          year,
          type: type || "public",
          description: description || "",
        },
        { new: true, runValidators: true }
      );

      if (!updated) {
        return res.status(404).json({ success: false, message: "Holiday not found" });
      }

      return res.status(200).json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // DELETE /api/payroll/holidays/:id  (soft delete)
  if (req.method === "DELETE") {
    try {
      const deleted = await Holiday.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!deleted) {
        return res.status(404).json({ success: false, message: "Holiday not found" });
      }

      return res.status(200).json({ success: true, message: "Holiday deleted successfully" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}