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




import { createRouter } from "next-connect";
import dbConnect from "@/utils/dbConnect";
import LeaveApplication from "@/models/employees/LeaveApplication";
import LeaveBalance from "@/models/employees/LeaveBalance";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import multer from "multer";
import path from "path";
import fs from "fs";

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

    const s = new Date(startDate);
    const e = new Date(endDate);

    if (e < s) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    /* ================= BASE DAYS ================= */

    const baseDays =
      Math.floor((e - s) / (1000 * 60 * 60 * 24)) + 1;

    /* ================= SANDWICH LOGIC (CORRECT) ================= */

    let sandwichLeave = false;
    let extraDeductedDays = 0;

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

    const totalDays = baseDays + extraDeductedDays;

    /* ================= LEAVE BALANCE ================= */

    const year = new Date(s).getFullYear();

    let balance = await LeaveBalance.findOne({
      employee: employee._id,
      year,
    });

    if (!balance) {
      balance = await LeaveBalance.create({
        employee: employee._id,
        year,
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

      policyFlags: {
        needsMedicalDoc,
        advanceNoticeIssue,
        sandwichLeave,
        extraDeductedDays,
      },
    });

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
