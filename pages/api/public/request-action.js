// POST — public, no-login mutation used by the /action/[type] landing page
// after the admin explicitly clicks Approve/Reject there (never on GET, so
// email link-scanners can't trigger this by prefetching the email CTA).
//
// Deliberately duplicates the status-update logic already in
// pages/api/admin/{overtime,leave,reimbursement}/{approve,reject}.js rather
// than sharing it, so this new public surface can never risk changing the
// behaviour of the existing logged-in admin dashboard flows.

import dbConnect from "@/utils/dbConnect";
import Overtime from "@/models/employees/Overtime";
import LeaveApplication from "@/models/employees/LeaveApplication";
import LeaveBalance from "@/models/employees/LeaveBalance";
import Reimbursement from "@/models/employees/Reimbursement";
import SalaryReport from "@/models/hr/SalaryReport";
import { verifyActionToken } from "@/utils/email/actionToken";
import {
  sendOvertimeApprovedEmail,
  sendOvertimeRejectedEmail,
} from "@/utils/email/sendOvertimeEmail";
import {
  sendLeaveApprovedEmail,
  sendLeaveRejectedEmail,
} from "@/utils/email/sendLeaveStatusEmail";
import {
  sendReimbursementApprovedEmail,
  sendReimbursementRejectedEmail,
} from "@/utils/email/sendReimbursementEmail";

const MODELS = {
  overtime: Overtime,
  leave: LeaveApplication,
  reimbursement: Reimbursement,
};

async function loadValidRecord(type, id, token) {
  const Model = MODELS[type];
  const record = await Model.findById(id).populate(
    "employee",
    "email personal firstName lastName"
  );
  if (!record) return { error: "not_found" };
  if (!record.emailActionToken || record.emailActionToken !== token) {
    return { error: "stale" };
  }
  if (record.emailActionTokenExpiry && record.emailActionTokenExpiry < new Date()) {
    return { error: "expired" };
  }
  if (record.status !== "Pending") {
    return { error: "already_actioned" };
  }
  return { record };
}

async function handleOvertime(overtime, action, remark) {
  const emp = overtime.employee;
  const name = emp.personal
    ? `${emp.personal.firstName || ""} ${emp.personal.lastName || ""}`.trim()
    : "Employee";

  if (action === "reject" && (!remark || !remark.trim())) {
    return { error: "remark_required" };
  }

  overtime.status = action === "approve" ? "Approved" : "Rejected";
  overtime.approvedBy = null;
  overtime.approvedAt = new Date();
  if (action === "reject") overtime.adminRemark = remark;
  overtime.emailActionToken = null;
  overtime.emailActionTokenExpiry = null;
  await overtime.save();

  if (action === "approve") {
    await SalaryReport.updateMany(
      {
        employee: overtime.employee._id,
        month: overtime.date.getMonth(),
        year: overtime.date.getFullYear(),
      },
      { $set: { status: "Pending" } }
    );
    sendOvertimeApprovedEmail({
      to: emp.email,
      name,
      project: overtime.project,
      date: overtime.date,
      otType: overtime.otType,
      startTime: overtime.startTime,
      endTime: overtime.endTime,
    }).catch((err) => console.error("OT approved employee email failed:", err));
  } else {
    sendOvertimeRejectedEmail({
      to: emp.email,
      name,
      project: overtime.project,
      date: overtime.date,
      otType: overtime.otType,
      remark,
    }).catch((err) => console.error("OT rejected employee email failed:", err));
  }

  return { status: overtime.status, employeeName: name };
}

async function handleLeave(leave, action, remark) {
  const emp = leave.employee;
  const name = emp.firstName
    ? `${emp.firstName} ${emp.lastName || ""}`.trim()
    : "Employee";

  if (action === "approve") {
    const year = new Date(leave.startDate).getFullYear();
    let balance = await LeaveBalance.findOne({ employee: leave.employee._id, year });
    if (!balance) {
      balance = await LeaveBalance.create({ employee: leave.employee._id, year });
    }

    if (leave.leaveType === "Sick Leave") {
      if (balance.sick.used + leave.totalDays > balance.sick.total) {
        return { error: "insufficient_balance" };
      }
      balance.sick.used += leave.totalDays;
    }
    if (leave.leaveType === "Earned Leave" || leave.leaveType === "Casual Leave") {
      if (balance.earned.used + leave.totalDays > balance.earned.total) {
        return { error: "insufficient_balance" };
      }
      balance.earned.used += leave.totalDays;
    }
    await balance.save();

    leave.status = "Approved";
    leave.adminRemark = remark || "";
    leave.approvedAt = new Date();
    leave.approvedBy = null;
    leave.emailActionToken = null;
    leave.emailActionTokenExpiry = null;
    await leave.save();

    sendLeaveApprovedEmail({
      to: emp.email,
      name,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      totalDays: leave.totalDays,
      remark,
    }).catch((err) => console.error("Leave approval email failed:", err));
  } else {
    leave.status = "Rejected";
    leave.adminRemark = remark || "";
    leave.rejectedAt = new Date();
    leave.rejectedBy = null;
    leave.emailActionToken = null;
    leave.emailActionTokenExpiry = null;
    await leave.save();

    sendLeaveRejectedEmail({
      to: emp.email,
      name,
      leaveType: leave.leaveType,
      startDate: leave.startDate,
      endDate: leave.endDate,
      remark,
    }).catch((err) => console.error("Leave rejection email failed:", err));
  }

  return { status: leave.status, employeeName: name };
}

async function handleReimbursement(reimbursement, action, remark) {
  const emp = reimbursement.employee;
  const name = emp.personal
    ? `${emp.personal.firstName || ""} ${emp.personal.lastName || ""}`.trim()
    : "Employee";

  reimbursement.status = action === "approve" ? "Approved" : "Rejected";
  if (action === "approve") reimbursement.approvedAt = new Date();
  reimbursement.approvedBy = null;
  if (action === "reject") reimbursement.adminRemark = remark || "";
  reimbursement.emailActionToken = null;
  reimbursement.emailActionTokenExpiry = null;
  await reimbursement.save();

  if (action === "approve") {
    sendReimbursementApprovedEmail({
      employeeEmail: emp.email,
      employeeName: name,
      category: reimbursement.category,
      amount: reimbursement.amount,
    });
  } else {
    sendReimbursementRejectedEmail({
      employeeEmail: emp.email,
      employeeName: name,
      category: reimbursement.category,
      amount: reimbursement.amount,
      remark,
    });
  }

  return { status: reimbursement.status, employeeName: name };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { type, id, token, action, remark } = req.body || {};

  if (!MODELS[type] || !id || !token || !["approve", "reject"].includes(action)) {
    return res.status(400).json({ success: false, message: "Bad request" });
  }

  const payload = verifyActionToken(token);
  if (!payload || payload.type !== type || payload.id !== String(id)) {
    return res.status(400).json({ success: false, code: "invalid" });
  }

  try {
    await dbConnect();

    const { record, error: loadError } = await loadValidRecord(type, id, token);
    if (loadError) {
      return res.status(409).json({ success: false, code: loadError });
    }

    let result;
    if (type === "overtime") result = await handleOvertime(record, action, remark);
    else if (type === "leave") result = await handleLeave(record, action, remark);
    else result = await handleReimbursement(record, action, remark);

    if (result.error) {
      return res.status(400).json({ success: false, code: result.error });
    }

    return res.json({
      success: true,
      status: result.status,
      employeeName: result.employeeName,
      actionedAt: new Date(),
    });
  } catch (err) {
    console.error(`Public ${type} action error:`, err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
}
