// GET  /api/employee/client-messages/[brandId] — fetch thread
// POST /api/employee/client-messages/[brandId] — send team reply
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Brand from "@/models/tasks/Brand";
import ClientMessage from "@/models/ClientMessage";

function verifyToken(req) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false });

  await dbConnect();

  const emp = await Employee.findById(payload.id).lean();
  if (!emp) return res.status(404).json({ success: false });

  const dept = (emp.professional?.department || "").toLowerCase();
  if (!dept.includes("digital") && !dept.includes("marketing"))
    return res.status(403).json({ success: false, message: "Access restricted to Digital Marketing department" });

  const { brandId } = req.query;
  const brand = await Brand.findById(brandId).lean();
  if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

  if (req.method === "GET") {
    // Mark all client messages as read by team
    await ClientMessage.updateMany(
      { brandId: brand._id, senderRole: "client", readByTeam: false },
      { $set: { readByTeam: true } }
    );

    const msgs = await ClientMessage.find({ brandId: brand._id })
      .sort({ createdAt: 1 })
      .lean();
    return res.json({ success: true, messages: msgs, brand: { name: brand.name, slug: brand.slug } });
  }

  if (req.method === "POST") {
    const { text, attachments } = req.body || {};
    if (!text?.trim() && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Viralon Team";
    const msg = await ClientMessage.create({
      brandId:     brand._id,
      senderRole:  "team",
      senderName:  name,
      senderId:    emp._id,
      text:        (text || "").trim(),
      attachments: (attachments || []).filter(a => a.url && a.name),
      readByTeam:  true,
      readByClient:false,
    });
    return res.status(201).json({ success: true, message: msg });
  }

  return res.status(405).end();
}
