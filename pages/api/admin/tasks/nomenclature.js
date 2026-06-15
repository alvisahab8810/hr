// GET - preview the auto-generated nomenclature for a brand + contentType combo
import dbConnect from "@/utils/dbConnect";
import Task     from "@/models/tasks/Task";
import Brand    from "@/models/tasks/Brand";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];

// Map contentType → monthlyDeliverables field name
const DELIV_KEY = { reel: "reels", post: "posts", carousel: "carousels", story: "stories" };

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

    // Count tasks created this calendar month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const currentMonthCount = await Task.countDocuments({
      brandId,
      contentType,
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });

    // Fetch the brand's monthly deliverable limit for this content type
    const brand       = await Brand.findById(brandId).lean();
    const delivKey    = DELIV_KEY[contentType];
    const monthlyLimit = brand?.monthlyDeliverables?.[delivKey] || 0;

    let serial, year, month;

    if (monthlyLimit > 0 && currentMonthCount >= monthlyLimit) {
      // Monthly quota is full — roll over to next month, reset serial to 1
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      month  = nextMonth.getMonth();
      year   = nextMonth.getFullYear();
      serial = 1;
    } else {
      // Still within this month's quota
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
