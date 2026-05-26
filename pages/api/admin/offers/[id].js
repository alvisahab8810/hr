import dbConnect from "@/utils/dbConnect";
import Offer from "@/models/Offer";
import "@/models/tasks/Brand";

function adminGuard(req, res) {
  if (!(req.headers.cookie || "").includes("admin_auth=true")) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (!adminGuard(req, res)) return;
  await dbConnect();
  const { id } = req.query;

  if (req.method === "PATCH") {
    try {
      const update = { ...req.body };
      if (update.target !== "specific") update.brandIds = [];
      if (update.validFrom) update.validFrom = new Date(update.validFrom);
      if (update.validUntil) update.validUntil = new Date(update.validUntil);
      else delete update.validUntil;

      const offer = await Offer.findByIdAndUpdate(id, update, { new: true })
        .populate("brandIds", "name color slug")
        .lean();
      if (!offer) return res.status(404).json({ success: false, message: "Not found" });
      return res.json({ success: true, offer });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  if (req.method === "DELETE") {
    try {
      await Offer.findByIdAndDelete(id);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  return res.status(405).end();
}
