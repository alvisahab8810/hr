// GET  - list all brands
// POST - create brand

import dbConnect from "@/utils/dbConnect";
import Brand from "@/models/tasks/Brand";
import "@/models/clients/Client";
import "@/models/hr/Employee";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const { search, clientId, isActive } = req.query;
      const q = {};
      if (clientId) q.clientId = clientId;
      if (isActive !== undefined) q.isActive = isActive === "true";
      if (search) q.name = { $regex: search, $options: "i" };

      const brands = await Brand.find(q)
        .populate("clientId", "name company")
        .populate("managers", "personal.firstName personal.lastName professional.designation")
        .sort({ name: 1 })
        .lean();

      return res.json({ success: true, brands });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST ── */
  if (req.method === "POST") {
    try {
      const {
        name, logo, color, contactEmail, clientId,
        services,
        monthlyDeliverables, weeklySchedule,
        websiteSettings, seoSettings, adsSettings, brandingSettings,
        managers, notes,
      } = req.body;
      if (!name?.trim()) return res.status(400).json({ success: false, message: "Brand name is required" });

      const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

      const brand = await Brand.create({
        name: name.trim(),
        slug,
        logo:                 logo || "",
        color:                color || "#6366F1",
        contactEmail:         contactEmail || "",
        clientId:             clientId || null,
        services:             Array.isArray(services) ? services : [],
        monthlyDeliverables:  monthlyDeliverables || {},
        weeklySchedule:       weeklySchedule || [],
        websiteSettings:      websiteSettings || {},
        seoSettings:          seoSettings || {},
        adsSettings:          adsSettings || {},
        brandingSettings:     brandingSettings || {},
        managers:             managers || [],
        notes:                notes || "",
      });

      const populated = await Brand.findById(brand._id)
        .populate("clientId", "name company")
        .lean();

      return res.status(201).json({ success: true, brand: populated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
