// import { createRouter } from "next-connect";
// import dbConnect from "@/utils/dbConnect";
// import LeaveApplication from "@/models/employees/LeaveApplication";
// import LeaveBalance from "@/models/employees/LeaveBalance";
// import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
// import multer from "multer";
// import path from "path";
// import fs from "fs";

// /* ================= FILE UPLOAD SETUP ================= */

// const uploadDir = path.join(process.cwd(), "public/uploads/leaves");

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// const storage = multer.diskStorage({
//   destination: uploadDir,
//   filename: (req, file, cb) => {
//     const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, unique + path.extname(file.originalname));
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
// });

// /* ================= NEXT CONFIG ================= */

// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// /* ================= ROUTER ================= */

// const router = createRouter();

// router.use(upload.array("documents"));

// router.post(async (req, res) => {
//   try {
//     await dbConnect();

//     const employee = await getEmployeeFromReq(req, res);
//     if (!employee) return;

//     const {
//       leaveType,
//       startDate,
//       endDate,
//       reason,
//       status = "Pending",
//     } = req.body;

//     if (!leaveType || !startDate || !endDate || !reason) {
//       return res.status(400).json({
//         success: false,
//         message: "Missing required fields",
//       });
//     }

//     const s = new Date(startDate);
//     const e = new Date(endDate);

//     if (e < s) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid date range",
//       });
//     }

//     const totalDays =
//       Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;

//     const year = new Date().getFullYear();

//     let balance = await LeaveBalance.findOne({
//       employee: employee._id,
//       year,
//     });

//     if (!balance) {
//       balance = await LeaveBalance.create({
//         employee: employee._id,
//         year,
//       });
//     }

//     const files = req.files || [];
//     const documents = files.map(
//       (f) => `/uploads/leaves/${f.filename}`
//     );

//     let needsMedicalDoc = false;
//     let advanceNoticeIssue = false;

//     if (leaveType === "Sick Leave" && totalDays > 3) {
//       needsMedicalDoc = true;

//       if (documents.length === 0) {
//         return res.status(400).json({
//           success: false,
//           message:
//             "Medical certificate required for sick leave over 3 days",
//         });
//       }
//     }

//     if (leaveType === "Earned Leave" && totalDays <= 3) {
//       const diffDays =
//         Math.floor((s - new Date()) / (1000 * 60 * 60 * 24));
//       if (diffDays < 1) advanceNoticeIssue = true;
//     }

//     if (
//       leaveType === "Sick Leave" &&
//       balance.sick.used + totalDays > balance.sick.total
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Insufficient sick leave balance",
//       });
//     }

//     if (
//       leaveType === "Earned Leave" &&
//       balance.earned.used + totalDays > balance.earned.total
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Insufficient earned leave balance",
//       });
//     }

//     const leave = await LeaveApplication.create({
//       employee: employee._id,
//       leaveType,
//       startDate: s,
//       endDate: e,
//       totalDays,
//       reason,
//       documents,
//       status,
//       policyFlags: {
//         needsMedicalDoc,
//         advanceNoticeIssue,
//       },
//     });

//     return res.json({ success: true, leave });
//   } catch (err) {
//     console.error("Apply leave error:", err);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//     });
//   }
// });

// /* ================= EXPORT ================= */

// export default router.handler({
//   onError(err, req, res) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Upload error" });
//   },
//   onNoMatch(req, res) {
//     res.status(405).json({ success: false });
//   },
// });



import { sendLeaveAppliedEmail } from "@/utils/email/sendLeaveEmail";
import { createRouter } from "next-connect";
import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import LeaveBalance from "@/models/employees/LeaveBalance";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { signActionToken } from "@/utils/email/actionToken";
import multer from "multer";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in";

/* ================= FILE UPLOAD SETUP ================= */

const uploadDir = path.join(process.cwd(), "public/uploads/leaves");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

/* ================= NEXT CONFIG ================= */

export const config = {
  api: {
    bodyParser: false,
  },
};

/* ================= HELPERS ================= */

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6; // Sunday or Saturday
}

/* ================= ROUTER ================= */

const router = createRouter();

router.use(upload.array("documents"));

router.post(async (req, res) => {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const employee = await getEmployeeFromReq(req, res);
    if (!employee) return;

    /* ================= BODY ================= */
    const {
      leaveType,
      startDate,
      endDate,
      reason,
      status = "Pending",
    } = req.body;

    if (!leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Casual Leave can only be applied during office hours 10:00 AM – 6:00 PM IST
    if (leaveType === "Casual Leave" && status !== "Draft") {
      const nowUtcMinutes = new Date().getUTCHours() * 60 + new Date().getUTCMinutes();
      const istMinutes = (nowUtcMinutes + 330) % 1440; // IST = UTC + 5:30
      if (istMinutes < 600 || istMinutes >= 1080) {
        return res.status(400).json({
          success: false,
          message: "Casual Leave can only be applied between 10:00 AM and 6:00 PM IST (office hours).",
        });
      }
    }

    const s = new Date(startDate);
    const e = new Date(endDate);

    if (e < s) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    // Reject past dates (compare against today in IST)
    const nowIST = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const todayStr = nowIST.toISOString().split("T")[0];
    if (startDate < todayStr) {
      return res.status(400).json({
        success: false,
        message: "Cannot apply leave for a past date",
      });
    }

    /* ================= HALF DAY LOGIC ================= */

    let totalDays;
    let sandwichLeave = false;
    let extraDeductedDays = 0;

    let isPaid = true;
    if (leaveType === "Half Day") {
      totalDays = 0.5;
      // First half day of the month = paid; any additional = unpaid (deduction applies)
      const monthStart = new Date(s.getFullYear(), s.getMonth(), 1);
      const monthEnd   = new Date(s.getFullYear(), s.getMonth() + 1, 1);
      const existing = await LeaveApplication.countDocuments({
        employee: employee._id,
        leaveType: "Half Day",
        status: { $in: ["Pending", "Approved"] },
        startDate: { $gte: monthStart, $lt: monthEnd },
      });
      isPaid = existing === 0; // 1st = paid, 2nd+ = unpaid
    } else {
      /* ================= BASE DAYS ================= */

      const baseDays = Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;

      /* ================= SANDWICH LOGIC (CORRECT) ================= */

      // ONLY check weekends BETWEEN start & end (not before / after)
      let cursor = new Date(s);
      cursor.setDate(cursor.getDate() + 1);

      while (cursor < e) {
        if (isWeekend(cursor) && leaveType !== "Sick Leave") {
          sandwichLeave = true;
          extraDeductedDays++;
        }
        cursor.setDate(cursor.getDate() + 1);
      }

      totalDays = baseDays + extraDeductedDays;
    }

    /* ================= LEAVE BALANCE ================= */

    // Use Indian financial year (April–March)
    const fyYear = s.getMonth() >= 3 ? s.getFullYear() : s.getFullYear() - 1;

    let balance = await LeaveBalance.findOne({
      employee: employee._id,
      year: fyYear,
    });

    if (!balance) {
      balance = await LeaveBalance.create({
        employee: employee._id,
        year: fyYear,
      });
    }

    /* ================= FILES ================= */

    const files = req.files || [];
    const documents = files.map(
      (f) => `/uploads/leaves/${f.filename}`
    );

    /* ================= POLICY FLAGS ================= */

    let needsMedicalDoc = false;
    let advanceNoticeIssue = false;

    // Sick Leave > 3 days → medical certificate required
    if (leaveType === "Sick Leave" && totalDays > 3) {
      needsMedicalDoc = true;

      if (!documents.length) {
        return res.status(400).json({
          success: false,
          message:
            "Medical certificate required for sick leave over 3 days",
        });
      }
    }

    // Earned Leave (1–3 days) → advance notice flag
    if (leaveType === "Earned Leave" && totalDays <= 3) {
      const diffDays = Math.floor(
        (s - new Date()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays < 1) advanceNoticeIssue = true;
    }

    /* ================= BALANCE CHECK ================= */

    if (
      leaveType === "Sick Leave" &&
      balance.sick.used + totalDays > balance.sick.total
    ) {
      return res.status(400).json({
        success: false,
        message: "Insufficient sick leave balance",
      });
    }

    if (
      leaveType === "Earned Leave" &&
      balance.earned.used + totalDays > balance.earned.total
    ) {
      return res.status(400).json({
        success: false,
        message: "Insufficient earned leave balance",
      });
    }

    /* ================= SAVE LEAVE ================= */

    const leave = await LeaveApplication.create({
      employee: employee._id,
      leaveType,
      startDate: s,
      endDate: e,
      totalDays,
      reason,
      documents,
      status,
      isPaid,

      policyFlags: {
        needsMedicalDoc,
        advanceNoticeIssue,
        sandwichLeave,
        extraDeductedDays,
      },
    });

    /* ================= SEND EMAIL (NON-BLOCKING) ================= */
try {
  let approveUrl, rejectUrl, dashboardUrl;
  if (leave.status === "Pending") {
    const { token: actionToken, expiry: actionTokenExpiry } = signActionToken({
      type: "leave",
      id: leave._id,
    });
    leave.emailActionToken = actionToken;
    leave.emailActionTokenExpiry = actionTokenExpiry;
    await leave.save();

    approveUrl = `${BASE_URL}/action/leave?id=${leave._id}&token=${actionToken}&action=approve`;
    rejectUrl = `${BASE_URL}/action/leave?id=${leave._id}&token=${actionToken}&action=reject`;
    dashboardUrl = `${BASE_URL}/dashboard/admin/leaves-management`;
  }

  sendLeaveAppliedEmail({
  employeeEmail: employee.email,
  employeeName: `${employee.firstName} ${employee.lastName}`,
  leaveType,
  startDate,
  endDate,
  totalDays,
  reason,
  approveUrl,
  rejectUrl,
  dashboardUrl,
}).catch((emailErr) => {
  console.error("Leave email failed:", emailErr);
});

} catch (emailErr) {
  console.error("Leave email failed:", emailErr);
  // ❗ Do NOT throw error — leave must still work
}



    return res.json({ success: true, leave });
  } catch (err) {
    console.error("Apply leave error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

/* ================= EXPORT ================= */

export default router.handler({
  onError(err, req, res) {
    console.error(err);
    res.status(500).json({ success: false, message: "Upload error" });
  },
  onNoMatch(req, res) {
    res.status(405).json({ success: false });
  },
});
