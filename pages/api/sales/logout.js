import { SALES_COOKIE } from "@/utils/salesAuth";

export default function handler(req, res) {
  const kill = (n) => `${n}=; Path=/; Max-Age=0; SameSite=Lax`;
  res.setHeader("Set-Cookie", [kill(SALES_COOKIE), kill("sales_name"), kill("sales_perms")]);
  return res.status(200).json({ success: true });
}
