// GET    - single client with linked projects + task summary
// PATCH  - update client
// DELETE - delete client

import dbConnect from "@/utils/dbConnect";
import Client  from "@/models/clients/Client";
import Project from "@/models/projects/Project";
import Task    from "@/models/tasks/Task";
import Brand   from "@/models/tasks/Brand";
import bcrypt  from "bcryptjs";

import { adminGuard } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;

  /* ── GET ── */
  if (req.method === "GET") {
    try {
      const client = await Client.findById(id)
        .populate("projects", "name status startDate endDate")
        .lean();

      if (!client) return res.status(404).json({ success: false, message: "Client not found" });

      const [projects, taskStats] = await Promise.all([
        Project.find({ clientId: id }).lean(),
        Task.aggregate([
          { $match: { clientId: client._id } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
      ]);

      const { password: _, ...safe } = client;
      return res.json({ success: true, client: safe, projects, taskStats });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── PATCH ── */
  if (req.method === "PATCH") {
    try {
      const { password, brandId, ...updates } = req.body;

      if (password) {
        updates.password    = await bcrypt.hash(password, 10);
        updates.passwordSet = true;
      }

      // Check email uniqueness if changing email
      if (updates.email) {
        updates.email = updates.email.toLowerCase().trim();
        const conflict = await Client.findOne({ email: updates.email, _id: { $ne: id } });
        if (conflict) return res.status(409).json({ success: false, message: "Email already in use by another client" });
      }

      const client = await Client.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true }
      ).populate("projects", "name status").lean();

      if (!client) return res.status(404).json({ success: false, message: "Client not found" });

      // Update brand link: unlink old brand(s), link new one
      if (brandId !== undefined) {
        // Remove this client from any brand that currently points to them
        await Brand.updateMany({ clientId: id }, { $set: { clientId: null } });
        // Link the new brand (if one was selected)
        if (brandId) {
          await Brand.findByIdAndUpdate(brandId, { $set: { clientId: id } });
        }
      }

      const { password: _, ...safe } = client;
      return res.json({ success: true, client: safe });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  /* ── DELETE ── */
  if (req.method === "DELETE") {
    try {
      await Client.findByIdAndDelete(id);
      return res.json({ success: true, message: "Client deleted" });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
