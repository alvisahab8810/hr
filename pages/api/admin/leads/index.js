// pages/api/admin/leads/index.js — the Leads CRM behind Website → Leads.
// Leads land here from the website's booking form (viralon-new writes into the
// shared "queries" collection); the team can also add one by hand.
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import LeadField from "@/models/LeadField";
import User from "@/models/User";
import Salesperson from "@/models/Salesperson";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const escapeRe = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    /* ── GET: the whole board in one round trip ─────────────────────────── */
    if (req.method === "GET") {
      const [leads, owners, reps, fields] = await Promise.all([
        Query.find({}).sort({ createdAt: -1 }).lean(),
        User.find({ role: "salesperson" }).select("name email").lean().catch(() => []),
        // Onboarded CRM salespeople are assignable the moment they are invited.
        Salesperson.find({ active: true }).select("name email").lean().catch(() => []),
        LeadField.find({}).sort({ order: 1, createdAt: 1 }).lean().catch(() => []),
      ]);

      return res.status(200).json({
        success: true,
        data: leads.map((l) => ({
          ...l,
          _id: String(l._id),
          // A Map comes back as a plain object through .lean(), but be safe.
          customFields: l.customFields instanceof Map
            ? Object.fromEntries(l.customFields)
            : (l.customFields || {}),
        })),
        owners: [...(reps || []), ...(owners || [])].map((u) => ({ _id: String(u._id), name: u.name, email: u.email })),
        fields: (fields || []).map((f) => ({ ...f, _id: String(f._id) })),
      });
    }

    /* ── POST: add a lead by hand ───────────────────────────────────────── */
    if (req.method === "POST") {
      const b = req.body || {};

      const name = String(b.name || "").trim();
      if (!name) {
        return res.status(400).json({ success: false, message: "Name is required" });
      }

      const email = String(b.email || "").trim().toLowerCase();
      const phone = String(b.phone || "").replace(/\D/g, "");

      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ success: false, message: "That email doesn't look right" });
      }
      if (phone && phone.length !== 10) {
        return res.status(400).json({ success: false, message: "Phone must be exactly 10 digits" });
      }

      // The same person shouldn't sit in the list twice — unless the team says so.
      if (!b.force && (email || phone)) {
        const or = [];
        if (email) or.push({ email: { $regex: `^${escapeRe(email)}$`, $options: "i" } });
        if (phone) or.push({ phone: { $in: [phone, `+91${phone}`, `91${phone}`] } });
        const clash = await Query.findOne({ $or: or }).select("_id name email phone").lean();
        if (clash) {
          return res.status(409).json({
            success: false,
            code: "DUPLICATE",
            message: `${clash.name || "A lead"} is already in the list with this ${
              String(clash.email || "").toLowerCase() === email ? "email" : "phone number"
            }.`,
          });
        }
      }

      const created = await Query.create({
        name,
        email,
        phone,
        businessName: String(b.businessName || "").trim(),
        formType: b.formType || "Added manually",
        budget: b.budget || "",
        status: b.status || "New",
        city: b.city || "",
        industry: b.industry || "",
        service: b.service || "",
        website: b.website || "",
        instagram: b.instagram || "",
        notes: b.notes || "",
        salespersonId: b.salespersonId || null,
        source: {
          utmSource:   b.source?.utmSource   || "",
          utmMedium:   b.source?.utmMedium   || "",
          utmCampaign: b.source?.utmCampaign || "",
          utmTerm:     b.source?.utmTerm     || "",
          utmContent:  b.source?.utmContent  || "",
          campaignId:  b.source?.campaignId  || "",
          adset:       b.source?.adset       || "",
          adName:      b.source?.adName      || "",
          gclid:       b.source?.gclid       || "",
          fbclid:      b.source?.fbclid      || "",
          landingPage: b.source?.landingPage || "",
          referrer:    b.source?.referrer    || "",
        },
        customFields: b.customFields || {},
        events: [{ at: new Date(), type: "created", text: "Lead added by hand from the CRM" }],
      });

      return res.status(201).json({ success: true, data: { ...created.toObject(), _id: String(created._id) } });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("leads api:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
