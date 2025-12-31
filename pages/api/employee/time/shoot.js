import dbConnect from "@/utils/dbConnect";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";

// If you want to persist these sessions you can add a Shoot model. For now we keep it simple.

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  await dbConnect();
  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  const { action } = req.body; // 'start' | 'stop'
  // For demo: we just return timestamps. You can extend to persist.
  const now = new Date();
  if (action === "start") return res.json({ success: true, message: "Shoot started", start: now });
  if (action === "stop") return res.json({ success: true, message: "Shoot stopped", end: now });
  return res.status(400).json({ success: false, message: "Invalid action" });
}