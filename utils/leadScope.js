// utils/leadScope.js — one lead, one owner.
// A salesperson may only touch the leads the admin has assigned to them. Every
// per-lead route calls this straight after the guard, so a stray id in the URL
// gets a 403 instead of someone else's lead.
import Query from "@/models/Query";
import { salesId } from "@/utils/salesAuth";

export async function ownsLead(req, res, leadId) {
  const mine = salesId(req);
  if (!mine) return true; // admin — the whole board

  const lead = await Query.findById(leadId).select("salespersonId").lean();
  if (lead && String(lead.salespersonId || "") === mine) return true;

  res.status(403).json({ success: false, message: "This lead is not assigned to you" });
  return false;
}
