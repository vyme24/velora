import { z } from "zod";

const passwordRule = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must include at least one uppercase letter")
  .regex(/[a-z]/, "Password must include at least one lowercase letter")
  .regex(/[0-9]/, "Password must include at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must include at least one special character");

export const registerSchema = z.object({
  name: z.string().min(2),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  email: z.string().email(),
  password: passwordRule,
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
  password: passwordRule
});
