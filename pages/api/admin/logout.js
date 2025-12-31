export default function handler(req, res) {
  res.setHeader(
    "Set-Cookie",
    `admin_auth=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  return res.status(200).json({ success: true });
}
