import bcrypt from "bcryptjs";
import { z } from "zod";

export const MIN_PASSWORD_LENGTH = 10;

export const newPasswordSchema = z
  .string({ required_error: `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.` })
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters for your password.`)
  .max(200, "Keep your password under 200 characters.");

export function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}
