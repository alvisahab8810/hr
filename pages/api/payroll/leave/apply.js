// import dbConnect from '@/utils/dbConnect';
// import LeaveRequest from '@/models/payroll/LeaveRequest';
// import Employee from '@/models/payroll/Employee';

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ success: false, message: 'Method not allowed' });
//   }

//   try {
//     await dbConnect();

//     const { type, from, to, reason, employeeId } = req.body;

//     // Validation
//     if (!type || !from || !to || !reason || !employeeId) {
//       return res.status(400).json({ success: false, message: 'All fields are required' });
//     }

//     // Verify employee exists
//     const employee = await Employee.findById(employeeId);
//     if (!employee) {
//       return res.status(404).json({ success: false, message: 'Employee not found' });
//     }

//     // Create leave request
//     const newLeave = await LeaveRequest.create({
//       employeeId,
//       type,
//       from,
//       to,
//       reason,
//     });

//     return res.status(200).json({ success: true, data: newLeave });

//   } catch (err) {
//     console.error('Leave apply error:', err);
//     return res.status(500).json({ success: false, message: 'Server error' });
//   }
// }




import dbConnect from "@/utils/dbConnect";
import LeaveRequest from "@/models/payroll/LeaveRequest";
import Employee from "@/models/payroll/Employee";
import Holiday from "@/models/payroll/Holiday";
import { evaluateLeavePolicy } from "@/utils/leavePolicy";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  await dbConnect();

  const {
    type,
    from,
    to,
    reason,
    employeeId,
    halfDay = false,
    emergency = false,
    justificationText = "",
    medicalCertUrl = "",
  } = req.body;

  if (!type || !from || !to || !reason || !employeeId) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    return res
      .status(404)
      .json({ success: false, message: "Employee not found" });
  }

  const fromDate = new Date(from);
  const toDate = new Date(to);

  // Get half-day usage for this month
  const startOfMonth = new Date(fromDate.getFullYear(), fromDate.getMonth(), 1);
  const endOfMonth = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth() + 1,
    0
  );
  const priorHalfDays = await LeaveRequest.countDocuments({
    employeeId,
    status: "Approved",
    "policyMeta.halfDay": true,
    from: { $gte: startOfMonth, $lte: endOfMonth },
  });

  // load holiday list for sandwich calc
  const holidays = await Holiday.find({
    date: { $gte: startOfMonth, $lte: endOfMonth },
  }).lean();

  // Evaluate policy
  const policyMeta = evaluateLeavePolicy({
    type,
    fromDate,
    toDate,
    requestedOn: new Date(),
    halfDaysUsedThisMonth: priorHalfDays,
    holidays,
    halfDayRequested: halfDay,
    emergencyRequested: emergency,
  });

  // Attach user-provided justification & cert
  if (justificationText) policyMeta.justificationText = justificationText;
  if (medicalCertUrl) policyMeta.medicalCertUrl = medicalCertUrl;

  // Create leave
  const newLeave = await LeaveRequest.create({
    employeeId,
    type,
    from: fromDate,
    to: toDate,
    reason,
    policyMeta,
  });

  return res.status(200).json({ success: true, data: newLeave });
}
