// // pages/api/protected/secret.js
// import verifyToken from "../../utils/verifyToken";

// export default async function handler(req, res) {
//   const user = verifyToken(req);
//   if (!user) return res.status(401).json({ message: "Unauthorized" });

//   if (user.role !== "admin") return res.status(403).json({ message: "Admins only" });

//   res.status(200).json({ message: "Welcome, admin!" });
// }
