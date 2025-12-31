// // pages/api/auth/login.js
// import dbConnect from "../../../utils/dbconnect";
// import User from "../../../models/User";
// import bcrypt from "bcryptjs";
// import jwt from "jsonwebtoken";

// export default async function handler(req, res) {
//   if (req.method !== "POST") return res.status(405).end();

//   await dbConnect();
//   const { email, password } = req.body;

//   const user = await User.findOne({ email });
//   if (!user) return res.status(400).json({ message: "User not found" });

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

//   const token = jwt.sign(
//     { userId: user._id, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: "1d" }
//   );

//   res.status(200).json({ token, user: { name: user.name, role: user.role } });
// }



