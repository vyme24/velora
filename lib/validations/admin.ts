import { z } from "zod";

export const adminCreateUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["user", "admin", "super_admin"]).default("user"),
  age: z.number().int().min(18).optional(),
  gender: z.string().optional(),
  lookingFor: z.string().optional()
});

export const adminUpdateUserSchema = z
  .object({
    name: z.string().min(2).optional(),
    role: z.enum(["user", "admin", "super_admin"]).optional(),
    accountStatus: z.enum(["active", "deactivated", "disabled"]).optional(),
    isVerified: z.boolean().optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required"
  });
