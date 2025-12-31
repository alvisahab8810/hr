


// pages/api/auth/register.js
import dbConnect from "../../../utils/dbConnect";
import User from "../../../models/User";

export default async function handler(req, res) {
  // ────────────────────────────────────────────────────────────────
  // 1. Allow only POST
  // ────────────────────────────────────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // ────────────────────────────────────────────────────────────────
  // 2. Pull & sanitise body
  // ────────────────────────────────────────────────────────────────
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").toLowerCase().trim();
  const password = req.body.password || "";

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }
  if (password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
  }

  // ────────────────────────────────────────────────────────────────
  // 3. DB work
  // ────────────────────────────────────────────────────────────────
  try {
    await dbConnect();

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(409).json({ message: "Email already registered" });
    }

    await User.create({ name, email, password }); // hashed by pre('save')

    return res.status(201).json({ message: "Account created" });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}
