// GET /api/client/me — returns client profile + brands they own
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";

function getToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const payload = getToken(req);
  if (!payload || payload.role !== "client") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();

  try {
    const client = await Client.findById(payload.id).lean();
    if (!client) return res.status(404).json({ success: false, message: "Client not found" });

    const brands = await Brand.find({ clientId: client._id })
      .select("name slug color logo services monthlyDeliverables weeklySchedule")
      .lean();

    const { password: _, ...safe } = client;
    return res.json({ success: true, client: safe, brands });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
