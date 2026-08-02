import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "viralon_invite_secret_2024";
const TOKEN_TTL = "30d";
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// type: "overtime" | "leave" | "reimbursement"
export function signActionToken({ type, id }) {
  const token = jwt.sign({ type, id: String(id) }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  });
  const expiry = new Date(Date.now() + TOKEN_TTL_MS);
  return { token, expiry };
}

export function verifyActionToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
