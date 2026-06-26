// GET - preview the auto-generated nomenclature for a brand + contentType combo
import dbConnect from "@/utils/dbConnect";
import Task     from "@/models/tasks/Task";
import Brand    from "@/models/tasks/Brand";
import { adminGuard } from "@/utils/admin/adminAuthGuard";

const MONTH_SHORT = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
const DELIV_KEY   = { reel: "reels", post: "posts", carousel: "carousels", story: "stories" };

function maxSerialFrom(docs) {
  return docs.reduce((max, t) => {
    const n = parseInt((t.nomenclature || "").match(/^[a-z]+(\d+)/)?.[1] || "0", 10);
    return Math.max(max, n);
  }, 0);
}

// Fetch tasks + count + maxSerial for a given month string (e.g. "jul'26")
async function monthStats(brandId, contentType, monthStr) {
  const docs = await Task.find(
    { brandId, contentType, nomenclature: { $regex: `^${contentType}\\d+ ${monthStr}$` } },
    { nomenclature: 1, _id: 0 }
  ).lean();
  return { count: docs.length, maxSerial: maxSerialFrom(docs) };
}

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

    // Determine effective starting month: max of (current calendar month, latest task's month)
    const latestTask = await Task.findOne(
      { brandId, contentType, nomenclature: { $regex: `^${contentType}\\d+ ` } },
      { nomenclature: 1 },
      { sort: { createdAt: -1 } }
    ).lean();

    let curMonth = now.getMonth();
    let curYear  = now.getFullYear();

    if (latestTask?.nomenclature) {
      const m = latestTask.nomenclature.match(/([a-z]{3})'(\d{2})$/);
      if (m) {
        const pm = MONTH_SHORT.indexOf(m[1]);
        const py = 2000 + parseInt(m[2], 10);
        if (py > curYear || (py === curYear && pm > curMonth)) {
          curMonth = pm;
          curYear  = py;
        }
      }
    }

    const brand        = await Brand.findById(brandId).lean();
    const delivKey     = DELIV_KEY[contentType];
    const monthlyLimit = brand?.monthlyDeliverables?.[delivKey] || 0;

    // Walk forward month by month until we find one that isn't full (max 24 months safety cap)
    let month = curMonth;
    let year  = curYear;
    let serial, finalMonth, finalYear;

    for (let i = 0; i < 24; i++) {
      const monthStr = `${MONTH_SHORT[month]}'${String(year).slice(2)}`;
      const { count, maxSerial } = await monthStats(brandId, contentType, monthStr);

      if (monthlyLimit === 0 || count < monthlyLimit) {
        serial     = maxSerial + 1;
        finalMonth = month;
        finalYear  = year;
        break;
      }

      // This month is full — advance to next
      const next = new Date(year, month + 1, 1);
      month = next.getMonth();
      year  = next.getFullYear();
    }

    const nomenclature = `${contentType}${serial} ${MONTH_SHORT[finalMonth]}'${String(finalYear).slice(2)}`;
    return res.json({ success: true, nomenclature });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
