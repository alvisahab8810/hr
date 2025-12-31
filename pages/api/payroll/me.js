// // pages/api/payroll/me.js
// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/payroll/Employee";
// import jwt from "jsonwebtoken";
// import cookie from "cookie";

// export default async function handler(req, res) {
//   await dbConnect();

//   const cookies = cookie.parse(req.headers.cookie || "");
//   const token = cookies.employee_auth;

//   if (!token) return res.status(401).json({ success: false });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const employee = await Employee.findById(decoded.id).lean();
//     if (!employee) return res.status(401).json({ success: false });
//     return res.status(200).json({ success: true, employee });
//   } catch {
//     return res.status(401).json({ success: false });
//   }
// }
