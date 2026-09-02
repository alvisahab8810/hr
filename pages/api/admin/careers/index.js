// pages/api/admin/careers/index.js — career applications submitted on the
// website's careers page (viralon-new writes them into the shared Mongo
// "applications" collection via its /api/careers/apply).
//
// Resume files live on the WEBSITE's disk (viralon-new /public/uploads), not
// here — so relative resumePath values ("/uploads/<file>") are rewritten to
// absolute URLs at the website's origin, same pattern as legacy blog images.
//
// DOMAIN PLAN: the website currently deploys at admin.viralon.in (temporary
// subdomain); once it moves to the prime domain, flip the default below to
// "https://viralon.in". Local dev: set WEBSITE_ORIGIN=http://localhost:3000.
import dbConnect from "@/utils/dbConnect";
import Application from "@/models/Application";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const WEBSITE_ORIGIN = (process.env.WEBSITE_ORIGIN || "https://admin.viralon.in").replace(/\/+$/, "");

function normalizeResumePath(p) {
  if (typeof p !== "string" || !p) return p;
  if (/^https?:\/\//i.test(p)) return p;
  return `${WEBSITE_ORIGIN}${p.startsWith("/") ? "" : "/"}${p}`;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const applications = await Application.find().sort({ createdAt: -1 }).lean();
    const data = applications.map(a => ({
      ...a,
      id: a._id,
      resumePath: normalizeResumePath(a.resumePath),
    }));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}
