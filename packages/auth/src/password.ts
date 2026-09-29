import bcrypt from "bcryptjs";

export async function hashPassword(password: string, rounds = 12): Promise<string> {
  if (typeof password !== "string" || password.length < 8 || Buffer.byteLength(password) > 72) throw new Error("Password must be at least 8 characters and at most 72 bytes");
  if (!Number.isInteger(rounds) || rounds < 10 || rounds > 16) throw new Error("Password rounds must be between 10 and 16");
  return bcrypt.hash(password, rounds);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  if (typeof password !== "string" || Buffer.byteLength(password) > 72) return false;
  return bcrypt.compare(password, passwordHash);
}
