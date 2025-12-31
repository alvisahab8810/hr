import User from "@/models/User";
import dbConnect from "@/utils/dbConnect";

export default async function handler(req, res) {
  await dbConnect();

  await User.create({
    name: "Admin",
    email: "admin@viralon.in",
    password: "admin123",   // ✅ PLAIN TEXT
    role: "admin",
  });

  res.json({ success: true });
}
