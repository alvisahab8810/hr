// POST /api/client/request-task — client submits a task request
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";
import { sendClientRequestEmail } from "@/utils/email/sendTaskEmail";

function getToken(req) {
  const cookie = req.headers.cookie || "";
  const match = cookie.match(/client_token=([^;]+)/);
  if (!match) return null;
  try { return jwt.verify(match[1], process.env.JWT_SECRET); }
  catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const payload = getToken(req);
  if (!payload || payload.role !== "client") {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();

  try {
    const { title, description, service, priority, brandId } = req.body;
    if (!title?.trim()) return res.status(400).json({ success: false, message: "Title is required" });

    const [client, brand] = await Promise.all([
      Client.findById(payload.id).lean(),
      Brand.findById(brandId).lean(),
    ]);

    if (!client || !brand) return res.status(404).json({ success: false, message: "Not found" });
    if (!brand.clientId || brand.clientId.toString() !== payload.id) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Send professional email to Viralon team
    sendClientRequestEmail({
      clientName:      client.name,
      clientEmail:     client.email,
      brandName:       brand.name,
      title,
      description,
      service,
      priority,
      referenceLinks:  req.body.referenceLinks || [],
    }).catch(e => console.error("[request-task] email failed:", e.message));

    return res.json({ success: true, message: "Request sent to your Viralon team" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
