// pages/api/admin/personal-development/set.js
// Admin sets/updates an employee's Personal Development score + note for a month

import dbConnect from "@/utils/dbConnect";
import PersonalDevelopmentGrade from "@/models/employees/PersonalDevelopmentGrade";
import { adminGuard, getAdminUserPayload } from "@/utils/admin/adminAuthGuard";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  if (!adminGuard(req, res)) return;

  await dbConnect();

  const { employeeId, month, year, score, note } = req.body;

  if (!employeeId) return res.status(400).json({ success: false, message: "employeeId required" });
  if (month === undefined || month === null) return res.status(400).json({ success: false, message: "month required" });
  if (!year) return res.status(400).json({ success: false, message: "year required" });
  if (score === undefined || score === null || Number(score) < 0 || Number(score) > 5) {
    return res.status(400).json({ success: false, message: "score must be between 0 and 5" });
  }

  const admin = getAdminUserPayload(req);

  const grade = await PersonalDevelopmentGrade.findOneAndUpdate(
    { employee: employeeId, month: Number(month), year: Number(year) },
    {
      $set: {
        score: Number(score),
        note: note?.trim() || "",
        setBy: admin?.id || null,
        setAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  return res.json({ success: true, data: grade });
}
