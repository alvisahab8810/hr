// GET /api/team/members — list all employees for @mention autocomplete
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

function resolveActor(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) {
    try {
      const p = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
      if (p?.id) return true;
    } catch {}
  }
  if ((req.headers.cookie || "").includes("admin_auth=true")) return true;
  return false;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!resolveActor(req)) return res.status(401).json({ success: false });

  await dbConnect();
  const employees = await Employee.find({ status: { $ne: "inactive" } })
    .select("firstName lastName professional.department professional.designation _id")
    .lean();

  const members = employees.map(e => ({
    _id:   e._id,
    name:  `${e.firstName || ""} ${e.lastName || ""}`.trim(),
    dept:  e.professional?.department || "",
    type:  "employee",
  })).filter(m => m.name);

  return res.json({ success: true, members });
}
