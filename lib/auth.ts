import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "@/lib/roles";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return secret;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hashed: string) {
  return bcrypt.compare(password, hashed);
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function hashOneWay(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateSecureToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function signAuthToken(payload: { userId: string; role: UserRole }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30m" });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as { userId: string; role: UserRole };
}

export function signRefreshToken(payload: { userId: string; role: UserRole }) {
  return jwt.sign({ ...payload, type: "refresh" }, getJwtSecret(), { expiresIn: "30d" });
}

export function verifyRefreshToken(token: string) {
  const decoded = jwt.verify(token, getJwtSecret()) as { userId: string; role: UserRole; type?: string };
  if (decoded.type !== "refresh") throw new Error("Invalid refresh token");
  return decoded;
}
