// GET /api/client/auth/logout
export default function handler(req, res) {
  res.setHeader("Set-Cookie", "client_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return res.json({ success: true });
}
