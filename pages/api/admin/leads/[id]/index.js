// pages/api/admin/leads/[id]/index.js — read / update / delete one lead.
// The Leads table saves inline, so PUT takes whatever subset of fields changed.
import mongoose from "mongoose";
import dbConnect from "@/utils/dbConnect";
import Query from "@/models/Query";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { ownsLead } from "@/utils/leadScope";
import { salesId } from "@/utils/salesAuth";

// Anything not on this list can't be written from the browser.
const PLAIN = [
  "name", "email", "phone", "businessName", "budget", "status",
  "city", "industry", "service", "website", "instagram", "notes",
  "score", "held", "matSent", "lostReason", "prep", "prepNotes", "formType",
  // The meeting the team fixes on the phone.
  "meetingMode", "meetingDate", "meetingTime", "meetLink", "meetingPlace",
];

const MEETING_MODES = ["", "Google Meet", "Phone call", "In person"];

const SOURCE_KEYS = [
  "gclid", "fbclid", "utmSource", "utmMedium", "utmCampaign", "utmTerm",
  "utmContent", "campaignId", "adset", "adName", "landingPage", "referrer",
];

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  const { id } = req.query;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Bad lead id" });
  }

  // A salesperson only reaches their own leads.
  if (!(await ownsLead(req, res, id))) return;

  try {
    if (req.method === "GET") {
      const lead = await Query.findById(id).lean();
      if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });
      return res.status(200).json({ success: true, data: { ...lead, _id: String(lead._id) } });
    }

    if (req.method === "PUT") {
      const b = req.body || {};
      const current = await Query.findById(id);
      if (!current) return res.status(404).json({ success: false, message: "Lead not found" });

      const set = {};
      const events = [];

      PLAIN.forEach((k) => {
        if (!(k in b)) return;
        if (k === "email") { set.email = String(b.email || "").trim().toLowerCase(); return; }
        if (k === "phone") { set.phone = String(b.phone || "").replace(/\D/g, ""); return; }
        if (k === "score") { set.score = b.score === null || b.score === "" ? null : Number(b.score); return; }
        if (k === "matSent") {
          set.matSent = !!b.matSent;
          set.matSentAt = b.matSent ? new Date() : null;
          return;
        }
        set[k] = b[k];
      });

      if (set.email && !/^\S+@\S+\.\S+$/.test(set.email)) {
        return res.status(400).json({ success: false, message: "That email doesn't look right" });
      }
      if (set.phone && set.phone.length !== 10) {
        return res.status(400).json({ success: false, message: "Phone must be exactly 10 digits" });
      }
      if ("meetingMode" in set && !MEETING_MODES.includes(set.meetingMode)) {
        return res.status(400).json({ success: false, message: "Pick how the meeting will happen" });
      }
      // Clearing the mode clears the whole meeting — a date with no mode is
      // just a number nobody can act on.
      if ("meetingMode" in set && !set.meetingMode) {
        set.meetingDate = "";
        set.meetingTime = "";
        set.meetLink = "";
        set.meetingPlace = "";
        set.held = "";
      }

      if (b.source && typeof b.source === "object") {
        SOURCE_KEYS.forEach((k) => {
          if (k in b.source) set[`source.${k}`] = String(b.source[k] || "");
        });
      }

      if (b.customFields && typeof b.customFields === "object") {
        Object.entries(b.customFields).forEach(([k, v]) => {
          set[`customFields.${k}`] = String(v ?? "");
        });
      }

      if (Array.isArray(b.connects)) set.connects = b.connects;
      if (Array.isArray(b.remindersSent)) set.remindersSent = b.remindersSent;
      if (b.scoreAnswers && typeof b.scoreAnswers === "object") set.scoreAnswers = b.scoreAnswers;

      // Only the admin hands leads out; a salesperson cannot reassign one.
      if (b.salespersonId !== undefined && !salesId(req)) {
        set.salespersonId = mongoose.Types.ObjectId.isValid(b.salespersonId) ? b.salespersonId : null;
      }

      // Journey entries the UI shouldn't have to spell out every time.
      if ("status" in set && set.status !== current.status) {
        events.push({ at: new Date(), type: "status", text: `Status moved to “${set.status}”` });
      }
      if ("meetingDate" in set || "meetingMode" in set) {
        const date = "meetingDate" in set ? set.meetingDate : current.meetingDate;
        const time = "meetingTime" in set ? set.meetingTime : current.meetingTime;
        const mode = "meetingMode" in set ? set.meetingMode : current.meetingMode;
        const changed = date !== current.meetingDate || time !== current.meetingTime || mode !== current.meetingMode;
        if (changed) {
          events.push(
            date && mode
              ? { at: new Date(), type: "meeting", text: `Meeting set — ${mode} on ${date}${time ? ` at ${time}` : ""}` }
              : { at: new Date(), type: "meeting", text: "Meeting cleared" }
          );
          // A fixed meeting moves the lead along, unless it's already past that.
          if (date && mode && ["New", "Contacted", "NPC"].includes(current.status) && !("status" in set)) {
            set.status = "Meeting booked";
            events.push({ at: new Date(), type: "status", text: "Status moved to “Meeting booked”" });
          }
        }
      }
      if ("held" in set && set.held !== current.held) {
        if (set.held === "held")   events.push({ at: new Date(), type: "meeting", text: "Consultation happened" });
        if (set.held === "noshow") events.push({ at: new Date(), type: "meeting", text: "Lead did not show up" });
      }
      if ("matSent" in set && set.matSent && !current.matSent) {
        events.push({ at: new Date(), type: "material", text: "Material pack marked as sent" });
      }
      if ("score" in set && set.score !== current.score && set.score !== null) {
        events.push({ at: new Date(), type: "score", text: `Scored ${set.score}/10` });
      }
      if (b.event?.text) {
        events.push({ at: new Date(), type: b.event.type || "note", text: String(b.event.text) });
      }

      const update = { $set: set };
      if (events.length) update.$push = { events: { $each: events } };

      const saved = await Query.findByIdAndUpdate(id, update, { new: true }).lean();
      return res.status(200).json({ success: true, data: { ...saved, _id: String(saved._id) } });
    }

    if (req.method === "DELETE") {
      // Deleting a lead is an admin action.
      if (salesId(req)) {
        return res.status(403).json({ success: false, message: "Only an admin can delete a lead" });
      }
      await Query.findByIdAndDelete(id);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("lead api:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
