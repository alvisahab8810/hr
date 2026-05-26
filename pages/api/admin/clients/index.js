// GET  - list all clients
// POST - create a new client

import dbConnect from "@/utils/dbConnect";
import Client from "@/models/clients/Client";
import "@/models/projects/Project";
import bcrypt from "bcryptjs";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

async function generateClientId() {
  const count = await Client.countDocuments();
  return `CLT-${String(count + 1).padStart(4, "0")}`;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const { status, search } = req.query;
      const q = {};

      if (status) q.status = status;
      if (search) {
        q.$or = [
          { name:    { $regex: search, $options: "i" } },
          { email:   { $regex: search, $options: "i" } },
          { company: { $regex: search, $options: "i" } },
        ];
      }

      const clients = await Client.find(q)
        .populate("projects", "name status")
        .sort({ createdAt: -1 })
        .lean();

      return res.json({ success: true, clients });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── POST ── */
  if (req.method === "POST") {
    try {
      const { name, email, phone, company, address, notes, password } = req.body;

      if (!name?.trim())  return res.status(400).json({ success: false, message: "Name is required" });
      if (!email?.trim()) return res.status(400).json({ success: false, message: "Email is required" });

      const existing = await Client.findOne({ email: email.toLowerCase().trim() });
      if (existing) return res.status(409).json({ success: false, message: "Client with this email already exists" });

      const clientId = await generateClientId();

      const clientData = {
        clientId,
        name:    name.trim(),
        email:   email.toLowerCase().trim(),
        phone:   phone   || "",
        company: company || "",
        address: address || "",
        notes:   notes   || "",
      };

      if (password) {
        clientData.password    = await bcrypt.hash(password, 10);
        clientData.passwordSet = true;
      }

      const client = await Client.create(clientData);

      const { password: _, ...safe } = client.toObject();
      return res.status(201).json({ success: true, client: safe });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
