// GET /api/admin/admin-users/activity?userId=<id>&category=&dateStart=&dateEnd=&page=&limit=
import dbConnect from "@/utils/dbConnect";
import AdminActivityLog from "@/models/AdminActivityLog";

function adminGuard(req, res) {
  const cookie = req.headers.cookie || "";
  if (!cookie.includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();

  const { userId, category, dateStart, dateEnd, page = 1, limit = 100 } = req.query;

  if (!userId) return res.status(400).json({ success: false, message: "userId required" });

  // Filtered query (for the log list)
  const q = { adminUserId: userId };
  if (category && category !== "all") q.category = category;
  if (dateStart || dateEnd) {
    q.createdAt = {};
    if (dateStart) q.createdAt.$gte = new Date(dateStart);
    if (dateEnd) {
      const end = new Date(dateEnd);
      end.setHours(23, 59, 59, 999);
      q.createdAt.$lte = end;
    }
  }

  // Base query (userId only) for accurate header stats
  const baseQ = { adminUserId: userId };
  const now   = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  try {
    const skip  = (Number(page) - 1) * Number(limit);
    const [logs, total, statsTotal, statsTask, statsToday, statsWeek] = await Promise.all([
      AdminActivityLog.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      AdminActivityLog.countDocuments(q),
      AdminActivityLog.countDocuments(baseQ),
      AdminActivityLog.countDocuments({ ...baseQ, category: "task" }),
      AdminActivityLog.countDocuments({ ...baseQ, createdAt: { $gte: todayStart } }),
      AdminActivityLog.countDocuments({ ...baseQ, createdAt: { $gte: weekStart } }),
    ]);

    return res.json({
      success: true,
      logs,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      stats: {
        total:    statsTotal,
        taskCount: statsTask,
        today:    statsToday,
        thisWeek: statsWeek,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
