// pages/api/admin/leads/fields.js — the extra columns the team adds to the
// Leads table themselves. The definition lives in leadfields; the value for a
// lead lives in Query.customFields[key].
import dbConnect from "@/utils/dbConnect";
import LeadField from "@/models/LeadField";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const slug = (s) =>
  String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const fields = await LeadField.find({}).sort({ order: 1, createdAt: 1 }).lean();
      return res.status(200).json({ success: true, data: fields.map((f) => ({ ...f, _id: String(f._id) })) });
    }

    if (req.method === "POST") {
      const label = String(req.body?.label || "").trim();
      if (!label) return res.status(400).json({ success: false, message: "Give the column a name" });

      const key = slug(label);
      if (!key) return res.status(400).json({ success: false, message: "That name can't be used as a column" });

      const clash = await LeadField.findOne({ key }).lean();
      if (clash) return res.status(409).json({ success: false, message: "A column with that name already exists" });

      const type = ["text", "number", "date", "select"].includes(req.body?.type) ? req.body.type : "text";
      const options = type === "select"
        ? String(req.body?.options || "").split(",").map((o) => o.trim()).filter(Boolean)
        : [];
      if (type === "select" && !options.length) {
        return res.status(400).json({ success: false, message: "A dropdown needs at least one option" });
      }

      const count = await LeadField.countDocuments({});
      const created = await LeadField.create({ key, label, type, options, order: count });
      return res.status(201).json({ success: true, data: { ...created.toObject(), _id: String(created._id) } });
    }

    if (req.method === "DELETE") {
      const key = String(req.query.key || "");
      if (!key) return res.status(400).json({ success: false, message: "Which column?" });
      // The values already saved on leads are left alone — nothing is lost if
      // the column is added back later.
      await LeadField.deleteOne({ key });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("lead fields:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
