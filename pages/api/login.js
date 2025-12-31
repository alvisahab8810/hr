
// import { serialize } from "cookie";

// export default function handler(req, res) {
//   const { username, password } = req.body;

//   if (username === "admin" && password === "admin123") {
//     const cookie = serialize("admin_auth", "true", {
//       path: "/",
//       httpOnly: true,
//       secure: true,
//       sameSite: "lax",
//       domain: req.headers.host.includes("localhost") ? undefined : "admin.viralon.in",
//       maxAge: 60 * 60 * 24,
//     });

//     console.log("✅ Setting cookie:", cookie);
//     res.setHeader("Set-Cookie", cookie);
//     return res.status(200).json({ success: true });
//   }

//   console.log("❌ Invalid login attempt:", { username, password });
//   return res.status(401).json({ success: false });
// }






// import { serialize } from "cookie";

// export default function handler(req, res) {
//   const { username, password } = req.body;

//   // Simple admin credentials check
//   if (username === "admin" && password === "admin123") {
//     // Get the current host dynamically (remove port if any)
//     const host = req.headers.host.split(":")[0];

//     const cookie = serialize("admin_auth", "true", {
//       path: "/",
//       httpOnly: true,
//       secure: true,
//       sameSite: "lax",
//       domain: host.includes("localhost") ? undefined : host,
//       maxAge: 60 * 60 * 24, // 1 day
//     });

//     console.log("✅ Setting cookie:", cookie);

//     // Send cookie in response
//     res.setHeader("Set-Cookie", cookie);
//     return res.status(200).json({ success: true });
//   }

//   console.log("❌ Invalid login attempt:", { username, password });
//   return res.status(401).json({ success: false });
// }



import { serialize } from "cookie";

export default function handler(req, res) {
  const { username, password } = req.body;

  // Simple admin credentials check
  if (username === "admin" && password === "admin123") {
    const cookieValue = "true"; // or a real JWT in production

    const cookie = serialize("admin_auth", cookieValue, {
      path: "/",
      httpOnly: true,
      secure: false,       // 🔹 set to false for localhost
      sameSite: "lax",     // works for cross-site requests if needed
      maxAge: 60 * 60 * 24, // 1 day
    });

    console.log("✅ Setting cookie:", cookie);

    res.setHeader("Set-Cookie", cookie);
    return res.status(200).json({ success: true });
  }

  console.log("❌ Invalid login attempt:", { username, password });
  return res.status(401).json({ success: false });
}
