import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { randomBytes } from "crypto";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  return bcrypt.compare(password, stored);
}

export function generateToken(): string {
  return randomBytes(24).toString("hex");
}

export function generateUUID(): string {
  return uuidv4();
}
