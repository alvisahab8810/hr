// export default function handler(req, res) {
//   const { username, password } = req.body;

//   if (username === process.env.ADMIN_USER && password === process.env.ADMIN_PASS) {
//     res.setHeader("Set-Cookie", `admin_auth=verified; Path=/; HttpOnly`);
//     return res.status(200).json({ success: true });
//   }

//   return res.status(401).json({ success: false, message: "Unauthorized" });
// }
