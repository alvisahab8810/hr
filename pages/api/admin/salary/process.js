// import dbConnect from "@/utils/dbConnect";
// import SalaryReport from "@/models/hr/SalaryReport";
// import { getAdminFromReq } from "@/utils/admin/getAdminFromReq";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();
//   const admin = await getAdminFromReq(req, res);
//   if (!admin) return res.status(401).json({ success: false });

//   const { id } = req.body;

//   await SalaryReport.findByIdAndUpdate(id, {
//     status: "Processed",
//     processedAt: new Date(),
//   });

//   res.json({ success: true });
// }



import dbConnect from "@/utils/dbConnect";
import SalaryReport from "@/models/hr/SalaryReport";
import { getEmployeeFromToken } from "@/utils/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    await dbConnect();

    // ✅ PRODUCTION-SAFE ADMIN AUTH
    const { employee, error } = await getEmployeeFromToken(req);

    if (error || !employee || employee.role !== "admin") {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, message: "Salary ID required" });
    }

    await SalaryReport.findByIdAndUpdate(id, {
      status: "Processed",
      processedAt: new Date(),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Process salary error:", err);
    return res.status(500).json({ success: false });
  }
}
