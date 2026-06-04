import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    await dbConnect();
    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    const { otId, extraMins, reason } = req.body;
    if (!otId || !extraMins || Number(extraMins) < 15) {
      return res.status(400).json({ success: false, message: "Invalid extension request" });
    }

    const ot = await Overtime.findOne({ _id: otId, employee: employee._id });
    if (!ot) return res.status(404).json({ success: false, message: "Overtime record not found" });
    if (ot.status !== "Approved") {
      return res.status(400).json({ success: false, message: "OT must be approved before requesting an extension" });
    }

    const hasPending = (ot.extensions || []).some(e => e.status === "Pending");
    if (hasPending) {
      return res.status(400).json({ success: false, message: "You already have a pending extension request. Wait for admin approval first." });
    }

    ot.extensions.push({
      extraMins: Number(extraMins),
      reason: reason || "",
      status: "Pending",
      requestedAt: new Date(),
    });

    await ot.save();
    return res.json({ success: true, overtime: ot });
  } catch (err) {
    console.error("Extend OT error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
