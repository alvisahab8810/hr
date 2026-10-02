// pages/api/admin/leads/[id]/convert.js — turn a won lead into a client.
// The client record is the one Operations already works off: a Brand hangs off
// a Client, so converting here is what lets Task Management → Brands pick the
// lead up. Nothing about brands changes — this only creates the client the
// brand will be attached to, and stamps the lead so it is never done twice.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import Client from "@/models/clients/Client";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";
import { advanceReceived, WON_RULE } from "@/utils/leadWon";
// The same CLT-0001 run the clients screen uses, so both roads number alike.
import { createClient } from "@/utils/clientId";

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad lead id" });
  }
  if (!(await ownsLead(req, res, id))) return;

  try {
    const lead = await Query.findById(id).lean();
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const email = String(lead.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "This lead has no email address. Add one on the lead first — a client record needs it.",
      });
    }

    // Converting stamps the lead Won, so it waits on the same rule everything
    // else does: no advance, no client.
    if (!lead.clientId && !(await advanceReceived(id))) {
      return res.status(400).json({ success: false, code: "NO_ADVANCE", message: WON_RULE });
    }

    // Already converted: hand back the same client rather than making a second.
    if (lead.clientId) {
      const had = await Client.findById(lead.clientId).lean();
      if (had) return res.status(200).json({ success: true, already: true, client: { ...had, _id: String(had._id) } });
    }

    // Somebody may have been added as a client by hand already; the email is
    // unique, so that record is linked instead of failing on a duplicate.
    let client = await Client.findOne({ email }).lean();
    if (!client) {
      client = await createClient({
        name:    String(lead.name || lead.businessName || "").trim() || email,
        email,
        phone:   String(lead.phone || "").trim(),
        company: String(lead.businessName || "").trim(),
        address: String(lead.city || "").trim(),
        notes:   String(lead.notes || "").trim(),
      });
    }

    await Query.findByIdAndUpdate(id, {
      $set: { clientId: client._id, convertedAt: new Date(), status: "Won" },
      $push: { events: { at: new Date(), type: "client", text: `Converted to client ${client.clientId}` } },
    });

    const { password: _drop, ...safe } = client;
    return res.status(201).json({ success: true, client: { ...safe, _id: String(safe._id) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
