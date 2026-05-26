// GET /api/employee/client-messages — list all brands with last message + unread count
// Only accessible by Digital Marketing department employees
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import Brand from "@/models/tasks/Brand";
import ClientMessage from "@/models/ClientMessage";
import "@/models/clients/Client";

function verifyToken(req) {
  const auth  = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ success: false });

  await dbConnect();

  const emp = await Employee.findById(payload.id).lean();
  if (!emp) return res.status(404).json({ success: false });

  const dept = (emp.professional?.department || "").toLowerCase();
  if (!dept.includes("digital") && !dept.includes("marketing"))
    return res.status(403).json({ success: false, message: "Access restricted to Digital Marketing department" });

  // Get all brands
  const brands = await Brand.find({})
    .select("name slug color logo clientId")
    .populate("clientId", "name email")
    .lean();

  // For each brand, get unread count + last message
  const brandIds = brands.map(b => b._id);

  const unreadAgg = await ClientMessage.aggregate([
    { $match: { brandId: { $in: brandIds }, senderRole: "client", readByTeam: false } },
    { $group: { _id: "$brandId", count: { $sum: 1 } } },
  ]);
  const unreadMap = {};
  for (const r of unreadAgg) unreadMap[String(r._id)] = r.count;

  const lastMsgAgg = await ClientMessage.aggregate([
    { $match: { brandId: { $in: brandIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$brandId", lastMsg: { $first: "$$ROOT" } } },
  ]);
  const lastMsgMap = {};
  for (const r of lastMsgAgg) lastMsgMap[String(r._id)] = r.lastMsg;

  const result = brands.map(b => ({
    _id:       b._id,
    name:      b.name,
    slug:      b.slug,
    color:     b.color,
    logo:      b.logo,
    client:    b.clientId,
    unread:    unreadMap[String(b._id)] || 0,
    lastMsg:   lastMsgMap[String(b._id)] || null,
  })).sort((a, b) => {
    // Brands with unread first, then by last message date
    if (b.unread !== a.unread) return b.unread - a.unread;
    const ta = a.lastMsg?.createdAt ? new Date(a.lastMsg.createdAt).getTime() : 0;
    const tb = b.lastMsg?.createdAt ? new Date(b.lastMsg.createdAt).getTime() : 0;
    return tb - ta;
  });

  return res.json({ success: true, brands: result });
}
