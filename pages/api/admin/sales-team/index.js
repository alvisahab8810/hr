// pages/api/admin/sales-team/index.js — the sales team behind Website → Sales team.
// GET hands back the team plus the leads, proposals and invoices their numbers
// are built from, so the board is one round trip like the rest of the CRM.
import dbConnect from "@/utils/dbConnect";
import Salesperson from "@/models/Salesperson";
import Query from "@/models/Query";
import Proposal from "@/models/Proposal";
import Invoice from "@/models/Invoice";
import { adminGuard } from "@/utils/admin/adminAuthGuard";
import { sendSalesInvite } from "@/utils/salesInviteMail";
import { salesRolePerms } from "@/utils/dept";

const MENUS = {
  home: "Website Home", blogs: "Blogs", careers: "Careers", positions: "Job Positions",
  pages: "SEO Pages", faqs: "FAQs", leads: "Leads", proposals: "Proposals",
  invoices: "Invoices", leadProfile: "Lead profile", salesTeam: "Sales team", reports: "Reports", slots: "Call Slots", settings: "Settings",
};

// Nothing is picked per person any more: a salesperson is the Sales department.
const cleanPerms = () => {
  const on = salesRolePerms();
  return Object.keys(MENUS).reduce((a, k) => ({ ...a, [k]: !!on[k] }), {});
};

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();

  try {
    if (req.method === "GET") {
      const [team, leads, proposals, invoices] = await Promise.all([
        Salesperson.find({}).sort({ createdAt: 1 }).lean(),
        Query.find({}).select("name businessName status budget salespersonId meetingDate held").lean(),
        Proposal.find({}).select("leadId status amount owner").lean(),
        Invoice.find({}).select("leadId amount status").lean(),
      ]);
      return res.status(200).json({
        success: true,
        menus: MENUS,
        team: team.map((t) => ({ ...t, _id: String(t._id) })),
        leads: leads.map((l) => ({ ...l, _id: String(l._id), salespersonId: l.salespersonId ? String(l.salespersonId) : "" })),
        proposals: proposals.map((p) => ({ ...p, _id: String(p._id), leadId: String(p.leadId) })),
        invoices: invoices.map((i) => ({ ...i, _id: String(i._id), leadId: String(i.leadId) })),
      });
    }

    if (req.method === "POST") {
      const b = req.body || {};
      const name = String(b.name || "").trim();
      const email = String(b.email || "").trim().toLowerCase();
      const username = String(b.username || "").trim().toLowerCase();
      const password = String(b.password || "");
      if (!name || !email || !username || !password) {
        return res.status(400).json({ success: false, message: "Name, email, username and password are all needed" });
      }
      if (await Salesperson.findOne({ username })) {
        return res.status(409).json({ success: false, message: "That username is already taken" });
      }

      const perms = cleanPerms();
      const sp = await Salesperson.create({
        name, email, username, password,
        role: String(b.role || "Sales Executive").trim(),
        phone: String(b.phone || "").trim(),
        target: Number(b.target || 0),
        color: b.color || "#6366F1",
        permissions: perms,
        active: true,
      });

      // The mail is the whole point of onboarding, but a dead SMTP box must not
      // lose the account that was just created.
      let mailed = true, mailError = "";
      try {
        const base = process.env.NEXT_PUBLIC_BASE_URL || "http://" + req.headers.host;
        await sendSalesInvite({
          to: email, name, username, password,
          loginUrl: base + "/sales/login",
          menus: Object.keys(MENUS).filter((k) => perms[k]).map((k) => MENUS[k]),
        });
      } catch (e) { mailed = false; mailError = e.message; }

      return res.status(201).json({ success: true, mailed, mailError, data: { ...sp.toObject(), _id: String(sp._id) } });
    }

    return res.status(405).json({ success: false, message: "Method not allowed" });
  } catch (error) {
    console.error("sales-team api:", error?.message);
    return res.status(500).json({ success: false, message: error.message });
  }
}
