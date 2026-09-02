// pages/api/admin/sales-team/[id].js — edit, switch off or remove a salesperson.
import dbConnect from "@/utils/dbConnect";
import Salesperson from "@/models/Salesperson";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { sendSalesInvite } from "@/utils/salesInviteMail";

const KEYS = ["name", "role", "email", "phone", "target", "color", "active", "password", "username"];

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();
  const { id } = req.query;

  try {
    if (req.method === "PATCH") {
      const b = req.body || {};
      const set = {};
      for (const k of KEYS) if (b[k] !== undefined) set[k] = k === "target" ? Number(b[k] || 0) : b[k];
      if (set.username) set.username = String(set.username).trim().toLowerCase();
      if (set.email) set.email = String(set.email).trim().toLowerCase();
      if (b.permissions) {
        for (const [k, v] of Object.entries(b.permissions)) set["permissions." + k] = !!v;
      }
      const sp = await Salesperson.findByIdAndUpdate(id, { $set: set }, { new: true });
      if (!sp) return res.status(404).json({ success: false, message: "Not found" });

      // Re-sending the login is an explicit ask, usually after a password change.
      if (b.resend) {
        const base = process.env.NEXT_PUBLIC_BASE_URL || "http://" + req.headers.host;
        try {
          await sendSalesInvite({
            to: sp.email, name: sp.name, username: sp.username, password: sp.password,
            loginUrl: base + "/sales/login",
            menus: Object.entries(sp.permissions?.toObject ? sp.permissions.toObject() : sp.permissions || {})
              .filter(([, v]) => v).map(([k]) => k),
          });
        } catch (e) {
          return res.status(200).json({ success: true, data: sp, mailed: false, mailError: e.message });
        }
      }
      return res.status(200).json({ success: true, data: sp, mailed: !!b.resend });
    }

    if (req.method === "DELETE") {
      await Salesperson.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
