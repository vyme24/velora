import { z } from "zod";

export const updateMeSchema = z
  .object({
    name: z.string().min(2).max(80).optional(),
    username: z
      .string()
      .min(3)
      .max(24)
      .regex(/^[a-zA-Z0-9_]+$/)
      .optional(),
    dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    gender: z.string().min(1).max(32).optional(),
    lookingFor: z.string().min(1).max(32).optional(),
    bio: z.string().max(800).optional(),
    photos: z.array(z.string().min(1)).max(6).optional(),
    interests: z.array(z.string().min(1).max(40)).max(20).optional(),
    location: z
      .object({
        city: z.string().max(64).optional(),
        state: z.string().max(64).optional(),
        country: z.string().max(64).optional(),
        radiusKm: z.number().int().min(1).max(500).optional()
      })
      .optional(),
    preferences: z
      .object({
        minAge: z.number().int().min(18).max(99).optional(),
        maxAge: z.number().int().min(18).max(99).optional(),
        gender: z.array(z.string().min(1).max(32)).max(5).optional(),
        verifiedOnly: z.boolean().optional(),
        onlineOnly: z.boolean().optional(),
        premiumOnly: z.boolean().optional()
      })
      .optional(),
    notifications: z
      .object({
        emailMessages: z.boolean().optional(),
        emailMatches: z.boolean().optional(),
        emailPromotions: z.boolean().optional(),
        pushMessages: z.boolean().optional(),
        pushMatches: z.boolean().optional()
      })
      .optional(),
    privacy: z
      .object({
        showOnlineStatus: z.boolean().optional(),
        showDistance: z.boolean().optional(),
        incognito: z.boolean().optional()
      })
      .optional()
  })
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field is required" });
