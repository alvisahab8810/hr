


import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  try {
    await dbConnect();
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
  const emp = await Employee.findById(payload.id).select(
  `
    employeeId
    firstName
    lastName
    email
    personal
    hasCompletedProfile
    salary
    professional
  `
);


    if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });

    res.json({ success: true, employee: emp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}








// // pages/api/employee/me.js
// import jwt from "jsonwebtoken";
// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/hr/Employee";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   try {
//     await dbConnect();

//     // Get token from Authorization header
//     const authHeader = req.headers.authorization || "";
//     const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

//     if (!token || token === "null" || token === "undefined") {
//       return res.status(401).json({ success: false, message: "Unauthorized" });
//     }

//     let payload;
//     try {
//       payload = jwt.verify(token, process.env.JWT_SECRET);
//     } catch (err) {
//       return res.status(401).json({ success: false, message: "Invalid or expired token" });
//     }

//     // Ensure payload is an employee
//     if (!payload.employeeId) {
//       return res.status(403).json({ success: false, message: "Not an employee token" });
//     }

//     const emp = await Employee.findById(payload.id).select(
//       "employeeId firstName lastName email hasCompletedProfile personal professional"
//     );

//     if (!emp) {
//       return res.status(404).json({ success: false, message: "Employee not found" });
//     }

//     res.json({ success: true, employee: emp });
//   } catch (err) {
//     console.error("Employee ME error:", err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// }
