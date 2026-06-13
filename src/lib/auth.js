import crypto from "crypto";
import * as jose from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "super-secret-developer-command-center-token-key-2026"
);

/**
 * Hashes a password using PBKDF2.
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verifies a password against a stored hash.
 */
export function verifyPassword(password, storedPassword) {
  if (!storedPassword || !storedPassword.includes(":")) return false;
  const [salt, originalHash] = storedPassword.split(":");
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

/**
 * Signs a payload into a JWT.
 */
export async function signToken(payload) {
  return await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(SECRET_KEY);
}

/**
 * Verifies a JWT and returns its payload, or null if invalid.
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (error) {
    return null;
  }
}
