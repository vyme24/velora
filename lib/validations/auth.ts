import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  email: z.string().email(),
  password: z.string().min(8),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "DOB must be in YYYY-MM-DD format"),
  gender: z.string().min(1),
  lookingFor: z.string().min(1),
  acceptedAgePolicy: z.literal(true)
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const verifyOtpSchema = z.object({
  userId: z.string().min(12),
  otp: z.string().length(6)
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32),
  password: z.string().min(8)
});
