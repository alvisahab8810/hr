import { serialize } from "cookie";

export default function handler(req, res) {
  const { username, password } = req.body;

  if (username === "admin" && password === "admin123") {
    const cookieValue = "true"; // replace with JWT later if needed

    const isProd = process.env.NODE_ENV === "production";

    const cookie = serialize("admin_auth", cookieValue, {
      path: "/",
      httpOnly: true,
      secure: isProd,                 // ✅ true in production
      sameSite: isProd ? "none" : "lax", // ✅ REQUIRED for HTTPS
      maxAge: 60 * 60 * 24,           // 1 day
    });

    console.log("✅ Setting cookie:", cookie);

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ success: true });
  }

  console.log("❌ Invalid login attempt:", { username });
  return res.status(401).json({ success: false });
}
