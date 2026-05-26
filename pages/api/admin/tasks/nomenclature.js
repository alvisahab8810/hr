// GET - preview the auto-generated nomenclature for a brand + contentType combo
import dbConnect from "@/utils/dbConnect";
import Task     from "@/models/tasks/Task";
import Brand    from "@/models/tasks/Brand";
import Employee from "@/models/hr/Employee";
import Project  from "@/models/projects/Project";
import Sprint   from "@/models/projects/Sprint";
import Client   from "@/models/clients/Client";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  if (req.method !== "GET") return res.status(405).end();

  await dbConnect();
  const { brandId, contentType } = req.query;
  if (!brandId || !contentType) {
    return res.status(400).json({ success: false, message: "brandId and contentType required" });
  }

  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const count = await Task.countDocuments({
      brandId,
      contentType,
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    const nomenclature = `${contentType}${count + 1} ${MONTH_SHORT[now.getMonth()]}'${String(now.getFullYear()).slice(2)}`;
    return res.json({ success: true, nomenclature });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
