// pages/api/payroll/holidays/index.js
import dbConnect from "@/utils/dbConnect";
import Holiday from "@/models/Holiday";

export default async function handler(req, res) {
  await dbConnect();

  // GET /api/payroll/holidays?year=2026
  if (req.method === "GET") {
    try {
      const year = req.query.year
        ? parseInt(req.query.year)
        : new Date().getFullYear();

      const holidays = await Holiday.find({ year, isActive: true })
        .sort({ startDate: 1 })
        .lean();

      return res.status(200).json({ success: true, data: holidays });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  // POST /api/payroll/holidays
  if (req.method === "POST") {
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

      const holiday = await Holiday.create({
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type: type || "public",
        description: description || "",
      });

      return res.status(201).json({ success: true, data: holiday });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
}