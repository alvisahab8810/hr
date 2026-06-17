// GET - preview the auto-generated nomenclature for a brand + contentType combo
import dbConnect from "@/utils/dbConnect";
import Task     from "@/models/tasks/Task";
import Brand    from "@/models/tasks/Brand";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const DELIV_KEY   = { reel: "reels", post: "posts", carousel: "carousels", story: "stories" };

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
    const curMonthStr  = `${MONTH_SHORT[now.getMonth()]}'${String(now.getFullYear()).slice(2)}`;

    // Count by nomenclature pattern so rolled-over tasks (createdAt in current month
    // but nomenclature in next month) are correctly excluded from current month count
    const currentMonthCount = await Task.countDocuments({
      brandId,
      contentType,
      nomenclature: { $regex: `^${contentType}\\d+ ${curMonthStr}$` },
    });

    const brand        = await Brand.findById(brandId).lean();
    const delivKey     = DELIV_KEY[contentType];
    const monthlyLimit = brand?.monthlyDeliverables?.[delivKey] || 0;

    let serial, month, year;

    if (monthlyLimit > 0 && currentMonthCount >= monthlyLimit) {
      // Monthly quota full — count how many already rolled over to next month
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const nextMonthStr  = `${MONTH_SHORT[nextMonthDate.getMonth()]}'${String(nextMonthDate.getFullYear()).slice(2)}`;
      const nextMonthCount = await Task.countDocuments({
        brandId,
        contentType,
        nomenclature: { $regex: `^${contentType}\\d+ ${nextMonthStr}$` },
      });
      month  = nextMonthDate.getMonth();
      year   = nextMonthDate.getFullYear();
      serial = nextMonthCount + 1;
    } else {
      month  = now.getMonth();
      year   = now.getFullYear();
      serial = currentMonthCount + 1;
    }

    const nomenclature = `${contentType}${serial} ${MONTH_SHORT[month]}'${String(year).slice(2)}`;
    return res.json({ success: true, nomenclature });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
