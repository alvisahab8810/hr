// GET  /api/employee/team-dm — employee reads their DM thread from admin
// POST /api/employee/team-dm — employee replies to admin
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import TeamDMMessage from "@/models/TeamDMMessage";

const ADMIN_OID = new mongoose.Types.ObjectId("000000000000000000000000");

function verifyToken(req) {
  const auth = req.headers.authorization || "";
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

  if (req.method === "GET") {
    // Mark all admin messages as read by employee
    await TeamDMMessage.updateMany(
      { adminId: ADMIN_OID, employeeId: emp._id, senderType: "admin", readByEmployee: false },
      { $set: { readByEmployee: true } }
    );
    const msgs = await TeamDMMessage.find({ adminId: ADMIN_OID, employeeId: emp._id })
      .sort({ createdAt: 1 })
      .lean();
    return res.json({ success: true, messages: msgs });
  }

  if (req.method === "POST") {
    const { text, attachments } = req.body || {};
    if (!text?.trim() && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    // Check if admin has messaged first (employee can only reply)
    const hasAdminMsg = await TeamDMMessage.exists({ adminId: ADMIN_OID, employeeId: emp._id, senderType: "admin" });
    if (!hasAdminMsg)
      return res.status(403).json({ success: false, message: "You can only reply after receiving a message from admin" });

    const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
    const msg = await TeamDMMessage.create({
      adminId:    ADMIN_OID,
      employeeId: emp._id,
      senderId:   emp._id,
      senderType: "employee",
      senderName: name,
      text:       (text || "").trim(),
      attachments:(attachments || []).filter(a => a.url && a.name),
      readByEmployee: true,
      readByAdmin:    false,
    });
    return res.status(201).json({ success: true, message: msg });
  }

  return res.status(405).end();
}
