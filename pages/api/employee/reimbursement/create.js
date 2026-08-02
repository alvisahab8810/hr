
import { sendReimbursementSubmittedEmail } from "@/utils/email/sendReimbursementEmail";
import dbConnect from "@/utils/dbConnect";
import Reimbursement from "@/models/employees/Reimbursement";
import { getEmployeeFromReq } from "@/utils/employees/getEmployeeFromReq";
import { signActionToken } from "@/utils/email/actionToken";
import multer from "multer";
import path from "path";
import fs from "fs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://hq.viralon.in";

export const config = {
  api: {
    bodyParser: false,
  },
};

// ensure upload dir exists
const uploadDir = path.join(process.cwd(), "public/uploads/reimbursements");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  await dbConnect();

  const employee = await getEmployeeFromReq(req, res);
  if (!employee) return;

  upload.array("attachments")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ success: false });
    }

    const { category, paymentDate, amount, description } = req.body;

    const files =
      req.files?.map(
        (file) => `/uploads/reimbursements/${file.filename}`
      ) || [];

    const reimbursement = await Reimbursement.create({
      employee: employee._id,
      category,
      paymentDate,
      amount,
      description,
      attachments: files,
    });


    /* ================= SEND EMAIL (BACKGROUND) ================= */
const { token: actionToken, expiry: actionTokenExpiry } = signActionToken({
  type: "reimbursement",
  id: reimbursement._id,
});
reimbursement.emailActionToken = actionToken;
reimbursement.emailActionTokenExpiry = actionTokenExpiry;
reimbursement.save().catch((err) => {
  console.error("Reimbursement token save failed:", err);
});

const approveUrl = `${BASE_URL}/action/reimbursement?id=${reimbursement._id}&token=${actionToken}&action=approve`;
const rejectUrl = `${BASE_URL}/action/reimbursement?id=${reimbursement._id}&token=${actionToken}&action=reject`;
const dashboardUrl = `${BASE_URL}/dashboard/admin/reimbursement`;

sendReimbursementSubmittedEmail({
  employeeEmail: employee.email,
  employeeName: `${employee.personal?.firstName || ""} ${employee.personal?.lastName || ""}`,
  category,
  amount,
  paymentDate,
  description,
  approveUrl,
  rejectUrl,
  dashboardUrl,
}).catch((err) => {
  console.error("Reimbursement submit email failed:", err);
});



    return res.json({
      success: true,
      reimbursement,
    });
  });
}
