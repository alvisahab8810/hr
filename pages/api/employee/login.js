import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { employeeId, password } = req.body;

  if (!employeeId || !password) {
    return res.status(400).json({ success: false, message: "Missing credentials" });
  }

  await dbConnect();

  const employee = await Employee.findOne({ employeeId });
  if (!employee) {
    return res.status(404).json({ success: false, message: "Employee not found" });
  }

  const isMatch = await bcrypt.compare(password, employee.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  // generate JWT (optional, if you want session based you can skip)
const token = jwt.sign(
  { id: employee._id, employeeId: employee.employeeId },
  process.env.JWT_SECRET
  // no expiresIn → token never expires
);


 

  return res.status(200).json({
  success: true,
  token,
  profileCompleted: employee.hasCompletedProfile, // ✅ explicit
  redirectUrl: employee.hasCompletedProfile
    ? "/employee/dashboard"
    : "/employee/complete-profile",
});

}

// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/hr/Employee";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";
// import cookie from "cookie";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   const { employeeId, password } = req.body;

//   if (!employeeId || !password) {
//     return res.status(400).json({ success: false, message: "Missing credentials" });
//   }

//   await dbConnect();

//   const employee = await Employee.findOne({ employeeId });
//   if (!employee) {
//     return res.status(404).json({ success: false, message: "Employee not found" });
//   }

//   const isMatch = await bcrypt.compare(password, employee.password);
//   if (!isMatch) {
//     return res.status(401).json({ success: false, message: "Invalid credentials" });
//   }

//   // ✅ generate non-expiring token
//   const token = jwt.sign(
//     { id: employee._id, employeeId: employee.employeeId, role: employee.role || "employee" },
//     process.env.JWT_SECRET,
//     { noTimestamp: true }
//   );

//   // ✅ set token in HTTP-only cookie
//   res.setHeader(
//     "Set-Cookie",
//     cookie.serialize("authToken", token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       path: "/",
//       maxAge: 60 * 60 * 24 * 365 // 1 year
//     })
//   );

//   return res.status(200).json({
//     success: true,
//     profileCompleted: employee.hasCompletedProfile,
//     redirectUrl: employee.hasCompletedProfile
//       ? "/employee/dashboard"
//       : "/employee/complete-profile",
//   });
// }
