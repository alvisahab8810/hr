// pages/api/employee/me.js
import jwt from "jsonwebtoken";
import dbConnect from "@/utils/dbConnect";
import Employee from "@/models/hr/Employee";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).end(); return; }

  try {
    await dbConnect();

    const authHeader = req.headers.authorization || "";
    const token      = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const emp = await Employee.findById(payload.id).select(
      "employeeId firstName lastName email personal hasCompletedProfile salary professional documents"
    );

    if (!emp) { res.status(404).json({ success: false, message: "Employee not found" }); return; }

    res.json({ success: true, employee: emp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}




// import jwt from "jsonwebtoken";
// import dbConnect from "@/utils/dbConnect";
// import Employee from "@/models/hr/Employee";

// export default async function handler(req, res) {
//   if (req.method !== "GET") return res.status(405).end();

//   try {
//     await dbConnect();
//     const authHeader = req.headers.authorization || "";
//     const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
//     if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });

//     const payload = jwt.verify(token, process.env.JWT_SECRET);
//   const emp = await Employee.findById(payload.id).select(
//   `
//     employeeId
//     firstName
//     lastName
//     email
//     personal
//     hasCompletedProfile
//     salary
//     professional
//   `
// );


//     if (!emp) return res.status(404).json({ success: false, message: "Employee not found" });

//     res.json({ success: true, employee: emp });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// }





