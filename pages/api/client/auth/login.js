// POST /api/client/auth/login
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import Brand from "@/models/tasks/Brand";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();

  const { email, password, brandSlug } = req.body;
  if (!email || !password || !brandSlug) {
    return res.status(400).json({ success: false, message: "Email, password and brand are required" });
  }

  try {
    const brand = await Brand.findOne({ slug: brandSlug.toLowerCase().trim() });
    if (!brand) return res.status(404).json({ success: false, message: "Brand not found" });

    const client = await Client.findOne({ email: email.toLowerCase().trim() }).select("+password");
    if (!client) return res.status(401).json({ success: false, message: "Invalid credentials" });

    if (!brand.clientId || brand.clientId.toString() !== client._id.toString()) {
      return res.status(403).json({ success: false, message: "You don't have access to this brand portal" });
    }

    if (client.status !== "Active") {
      return res.status(403).json({ success: false, message: "Account is inactive. Contact Viralon." });
    }

    const ok = await bcrypt.compare(password, client.password || "");
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: client._id.toString(), email: client.email, role: "client" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const isProd = process.env.NODE_ENV === "production";
    res.setHeader("Set-Cookie", [
      `client_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}${isProd ? "; Secure" : ""}`,
    ]);

    return res.json({ success: true, brandSlug });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
