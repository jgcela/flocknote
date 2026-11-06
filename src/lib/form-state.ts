import { Prisma } from "@prisma/client";
import { z } from "zod";

/** Result returned by every form server action. */
export type FormState = {
  /** Error summary shown above the form. */
  message?: string;
  /** Success message shown above the form. */
  notice?: string;
  errors?: Record<string, string>;
};

export const EMPTY_FORM_STATE: FormState = {};

export function zodErrors(error: z.ZodError): FormState {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { message: "Please fix the highlighted fields.", errors };
}

export function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export function isForeignKeyViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003";
}

// ── Reusable field parsers for FormData (every value arrives as a string) ──

/** Trimmed text; empty becomes null. */
export const optionalText = (max = 200) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .optional()
    .transform((v) => (v ? v : null));

export const requiredText = (label: string, max = 120) =>
  z.string({ required_error: `Please enter ${label}.` }).trim().min(1, `Please enter ${label}.`).max(max);

export const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || z.string().email().safeParse(v).success, "Please enter a valid email address.");

/** Accepts common formats, stores "+<digits>" or "<digits>". */
export const optionalPhone = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\+?[\d\s().-]{7,20}$/.test(v), "Please enter a valid phone number.")
  .transform((v) => (v ? (v.startsWith("+") ? "+" : "") + v.replace(/\D/g, "") : null));

/** <input type="date"> value → Date (UTC midnight) or null. */
export const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "Please enter a valid date.")
  .transform((v) => (v ? new Date(`${v}T00:00:00.000Z`) : null));

/** Checkbox: present ("on") → true, missing → false. */
export const checkbox = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true");

/** Optional id from a <select>; "" → null. */
export const optionalId = z
  .string()
  .optional()
  .transform((v) => (v ? v : null));

export function toDateInput(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}
