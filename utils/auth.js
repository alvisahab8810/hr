

import jwt from "jsonwebtoken";
import Employee from "@/models/hr/Employee";
import dbConnect from "@/utils/dbConnect";
import cookie from "cookie";

export async function getEmployeeFromToken(req) {
  try {
    await dbConnect();

    let token = null;

    // ✅ Read from the correct cookie name
    if (req.cookies?.admin_auth) {
      token = req.cookies.admin_auth;
    }

    // Fallback: parse raw cookie header
    if (!token && req.headers.cookie) {
      const parsed = cookie.parse(req.headers.cookie);
      token = parsed.admin_auth || null;
    }

    // Also support Authorization header
    if (!token && req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.slice(7);
    }

    if (!token) return { error: "No token" };

    // For dev, you can skip JWT verification if it's just 'true' (for admin_auth)
    // Otherwise verify real JWT
    // const payload = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true });

    // For now, return a mock employee object for admin
    const employee = { id: "admin", role: "admin" };

    return { employee };
  } catch (err) {
    console.error("getEmployeeFromToken error:", err.message);
    return { error: "Unauthorized" };
  }
}
