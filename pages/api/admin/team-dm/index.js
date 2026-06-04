// GET /api/admin/team-dm — list all employees with last DM + unread count
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import TeamDMMessage from "@/models/TeamDMMessage";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  if (!(req.headers.cookie || "").includes("admin_auth=true"))
    return res.status(401).json({ success: false });

  await dbConnect();

  const employees = await Employee.find({ status: { $ne: "inactive" } })
    .select("firstName lastName personal professional.department professional.designation _id")
    .lean();

  const empIds = employees.map(e => e._id);

  // Unread per employee (messages from employee not read by admin)
  const unreadAgg = await TeamDMMessage.aggregate([
    { $match: { employeeId: { $in: empIds }, senderType: "employee", readByAdmin: false } },
    { $group: { _id: "$employeeId", count: { $sum: 1 } } },
  ]);
  const unreadMap = {};
  for (const r of unreadAgg) unreadMap[String(r._id)] = r.count;

  // Last message per employee
  const lastMsgAgg = await TeamDMMessage.aggregate([
    { $match: { employeeId: { $in: empIds } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$employeeId", lastMsg: { $first: "$$ROOT" } } },
  ]);
  const lastMsgMap = {};
  for (const r of lastMsgAgg) lastMsgMap[String(r._id)] = r.lastMsg;

  const result = employees.map(e => ({
    _id:     e._id,
    name:    `${e.firstName || ""} ${e.lastName || ""}`.trim(),
    dept:    e.professional?.department || "",
    desig:   e.professional?.designation || "",
    avatar:  e.personal?.avatar || null,
    unread:  unreadMap[String(e._id)] || 0,
    lastMsg: lastMsgMap[String(e._id)] || null,
  })).sort((a, b) => {
    if (b.unread !== a.unread) return b.unread - a.unread;
    const ta = a.lastMsg?.createdAt ? new Date(a.lastMsg.createdAt).getTime() : 0;
    const tb = b.lastMsg?.createdAt ? new Date(b.lastMsg.createdAt).getTime() : 0;
    return tb - ta;
  });

  return res.json({ success: true, employees: result });
}
