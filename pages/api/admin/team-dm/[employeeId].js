// GET  /api/admin/team-dm/[employeeId] — load DM thread with employee
// POST /api/admin/team-dm/[employeeId] — send DM to employee
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import TeamDMMessage from "@/models/TeamDMMessage";
import AdminUser from "@/models/AdminUser";

const ADMIN_OID = new mongoose.Types.ObjectId("000000000000000000000000");

export default async function handler(req, res) {
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();
  const { employeeId } = req.query;

  const emp = await Employee.findById(employeeId).lean();
  if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });

  if (req.method === "GET") {
    // Mark all employee-sent messages as read by admin
    await TeamDMMessage.updateMany(
      { adminId: ADMIN_OID, employeeId: emp._id, senderType: "employee", readByAdmin: false },
      { $set: { readByAdmin: true } }
    );
    const msgs = await TeamDMMessage.find({ adminId: ADMIN_OID, employeeId: emp._id })
      .sort({ createdAt: 1 })
      .lean();
    return res.json({
      success: true,
      messages: msgs,
      employee: {
        _id:   emp._id,
        name:  `${emp.firstName || ""} ${emp.lastName || ""}`.trim(),
        dept:  emp.professional?.department || "",
        desig: emp.professional?.designation || "",
      },
    });
  }

  if (req.method === "POST") {
    const { text, attachments } = req.body || {};
    if (!text?.trim() && (!attachments || attachments.length === 0))
      return res.status(400).json({ success: false, message: "Message cannot be empty" });

    const msg = await TeamDMMessage.create({
      adminId:    ADMIN_OID,
      employeeId: emp._id,
      senderId:   ADMIN_OID,
      senderType: "admin",
      senderName: "Admin",
      text:       (text || "").trim(),
      attachments:(attachments || []).filter(a => a.url && a.name),
      readByEmployee: false,
      readByAdmin:    true,
    });
    return res.status(201).json({ success: true, message: msg });
  }

  return res.status(405).end();
}
