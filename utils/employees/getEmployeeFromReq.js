// utils/getEmployeeFromReq.js
import jwt from "jsonwebtoken";
import Employee from "@/models/hr/Employee";


export async function getEmployeeFromReq(req, res) {
const authHeader = req.headers.authorization || "";
const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
if (!token) {
if (res) res.status(401).json({ success: false, message: "No token" });
return null;
}
try {
const payload = jwt.verify(token, process.env.JWT_SECRET);
const employee = await Employee.findById(payload.id);
if (!employee) {
if (res) res.status(401).json({ success: false, message: "Invalid token" });
return null;
}
return employee;
} catch (err) {
if (res) res.status(401).json({ success: false, message: "Invalid token" });
return null;
}
}