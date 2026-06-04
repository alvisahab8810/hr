import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    await dbConnect();

    const { employee: admin, error } = await getEmployeeFromToken(req);
    if (error || !admin || admin.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { otId, extensionId, action, remark } = req.body;
    if (!otId || !extensionId || !["approve", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const ot = await Overtime.findById(otId);
    if (!ot) return res.status(404).json({ success: false, message: "OT not found" });

    const ext = ot.extensions.id(extensionId);
    if (!ext) return res.status(404).json({ success: false, message: "Extension not found" });
    if (ext.status !== "Pending") {
      return res.status(400).json({ success: false, message: "Extension already processed" });
    }

    ext.status      = action === "approve" ? "Approved" : "Rejected";
    ext.approvedAt  = new Date();
    ext.adminRemark = remark || "";

    await ot.save();

    const populated = await Overtime.findById(otId).populate(
      "employee",
      "personal firstName lastName email professional"
    );
    return res.json({ success: true, overtime: populated });
  } catch (err) {
    console.error("Extend approve error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
