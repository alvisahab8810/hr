// GET — public, no-login lookup used by the /action/[type] landing page.
// Read-only by design: this must never mutate state (see request-action.js
// for the actual approve/reject mutation), so email scanners/prefetchers
// that GET this link can't accidentally action a request.

import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import LeaveApplication from "@/models/employees/LeaveApplication";
import Reimbursement from "@/models/employees/Reimbursement";
import { verifyActionToken } from "@/utils/email/actionToken";

const MODELS = {
  overtime: Overtime,
  leave: LeaveApplication,
  reimbursement: Reimbursement,
};

function buildCard(type, record) {
  const emp = record.employee || {};
  if (type === "overtime") {
    const employeeName = emp.personal
      ? `${emp.personal.firstName || ""} ${emp.personal.lastName || ""}`.trim()
      : "Employee";
    return {
      typeLabel: "Overtime request",
      employeeName,
      fields: [
        { label: "Date", value: new Date(record.date).toDateString() },
        { label: "Type", value: record.otType },
        { label: "Time", value: `${record.startTime} – ${record.endTime}` },
        { label: "Project", value: record.project },
        { label: "Reason", value: record.reason, full: true },
        { label: "Tasks", value: record.tasks, full: true },
      ],
    };
  }
  if (type === "leave") {
    const employeeName = emp.firstName
      ? `${emp.firstName} ${emp.lastName || ""}`.trim()
      : "Employee";
    return {
      typeLabel: "Leave application",
      employeeName,
      fields: [
        { label: "Leave Type", value: record.leaveType },
        {
          label: "Dates",
          value: `${new Date(record.startDate).toDateString()} – ${new Date(record.endDate).toDateString()}`,
        },
        { label: "Total Days", value: record.totalDays },
        { label: "Paid", value: record.isPaid ? "Paid" : "Unpaid" },
        { label: "Reason", value: record.reason, full: true },
      ],
    };
  }
  // reimbursement
  const employeeName = emp.personal
    ? `${emp.personal.firstName || ""} ${emp.personal.lastName || ""}`.trim()
    : "Employee";
  return {
    typeLabel: "Reimbursement request",
    employeeName,
    fields: [
      { label: "Category", value: record.category },
      { label: "Amount", value: `₹${record.amount}` },
      { label: "Payment Date", value: new Date(record.paymentDate).toDateString() },
      { label: "Description", value: record.description, full: true },
    ],
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { type, id, token } = req.query;
  const Model = MODELS[type];
  if (!Model || !id || !token) {
    return res.status(400).json({ success: false, valid: false, reason: "bad_request" });
  }

  const payload = verifyActionToken(token);
  if (!payload || payload.type !== type || payload.id !== String(id)) {
    return res.json({ success: true, valid: false, reason: "invalid" });
  }

  await dbConnect();

  const record = await Model.findById(id).populate(
    "employee",
    "email personal firstName lastName"
  );
  if (!record) {
    return res.json({ success: true, valid: false, reason: "not_found" });
  }

  if (!record.emailActionToken || record.emailActionToken !== token) {
    return res.json({
      success: true,
      valid: false,
      reason: "stale",
      status: record.status,
    });
  }

  if (record.emailActionTokenExpiry && record.emailActionTokenExpiry < new Date()) {
    return res.json({ success: true, valid: false, reason: "expired", status: record.status });
  }

  if (record.status !== "Pending") {
    return res.json({
      success: true,
      valid: false,
      reason: "already_actioned",
      status: record.status,
      adminRemark: record.adminRemark || "",
    });
  }

  return res.json({
    success: true,
    valid: true,
    status: record.status,
    ...buildCard(type, record),
  });
}
