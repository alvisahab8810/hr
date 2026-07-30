// POST /api/admin/leave/revoke
// Deletes an Approved leave and restores the employee's leave balance.
import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import LeaveBalance from "@/models/employees/LeaveBalance";
import { getAdminUserPayload } from "@/utils/admin/adminAuthGuard";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    /* ── AUTH (same pattern as approve.js) ── */
    const subAdmin = getAdminUserPayload(req);
    const cookie = req.headers.cookie || "";
    const isMainAdmin = cookie.includes("admin_auth=true");

    if (!subAdmin && !isMainAdmin) {
      const { employee: emp, error } = await getEmployeeFromToken(req);
      if (error || !emp || emp.role !== "admin") {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }
    }

    /* ── VALIDATE INPUT ── */
    const { leaveId } = req.body || {};
    if (!leaveId) return res.status(400).json({ success: false, message: "leaveId required" });

    /* ── FIND LEAVE ── */
    const leave = await LeaveApplication.findById(leaveId);
    if (!leave) return res.status(404).json({ success: false, message: "Leave not found" });
    if (leave.status !== "Approved") {
      return res.status(400).json({ success: false, message: "Only Approved leaves can be revoked" });
    }

    /* ── RESTORE BALANCE ── */
    const year = new Date(leave.startDate).getFullYear();
    const balance = await LeaveBalance.findOne({ employee: leave.employee, year });

    if (balance) {
      if (leave.leaveType === "Sick Leave") {
        balance.sick.used = Math.max(0, (balance.sick.used || 0) - leave.totalDays);
      } else {
        // Casual Leave and Earned Leave both use earned.used
        balance.earned.used = Math.max(0, (balance.earned.used || 0) - leave.totalDays);
      }
      await balance.save();
    }

    /* ── DELETE LEAVE ── */
    await LeaveApplication.findByIdAndDelete(leaveId);

    return res.json({ success: true, message: "Leave revoked and balance restored" });
  } catch (err) {
    console.error("Revoke leave error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
}
