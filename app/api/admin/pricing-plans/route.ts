import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { verifyCsrf } from "@/lib/csrf";
import { PricingPlan } from "@/models/PricingPlan";
import { ensureDefaultPricingPlans } from "@/lib/pricing";

const createSchema = z.object({
  key: z.string().min(2).max(80),
  kind: z.enum(["coin", "subscription"]),
  label: z.string().min(1).max(120),
  badge: z.string().max(80).optional().default(""),
  amount: z.number().int().positive(),
  currency: z.string().min(3).max(10).optional().default("usd"),
  coins: z.number().int().min(0).optional().default(0),
  extra: z.number().int().min(0).max(1000).optional().default(0),
  subscriptionKey: z.enum(["gold", "platinum"]).optional(),
  stripePriceId: z.string().max(200).optional().nullable(),
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(10000).optional().default(100)
});

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req);
  if ("response" in auth) return auth.response;

  await ensureDefaultPricingPlans();

  const plans = await PricingPlan.find({}).sort({ kind: 1, sortOrder: 1, amount: 1 });
  return ok({ plans, actorRole: auth.actor.role });
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

  const auth = await requireAdminActor(req, { superOnly: true });
  if ("response" in auth) return auth.response;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const data = parsed.data;
  if (data.kind === "subscription" && !data.subscriptionKey) {
    return fail("subscriptionKey is required for subscription plan", 422);
  }

  if (data.kind === "coin" && data.coins <= 0) {
    return fail("coins must be greater than 0 for coin package", 422);
  }

  const exists = await PricingPlan.findOne({ key: data.key.toLowerCase() });
  if (exists) return fail("Plan key already exists", 409);

  const created = await PricingPlan.create({
    ...data,
    key: data.key.toLowerCase(),
    currency: data.currency.toLowerCase(),
    subscriptionKey: data.kind === "subscription" ? data.subscriptionKey || null : null,
    coins: data.kind === "coin" ? data.coins : 0
  });

  return ok({ plan: created }, { status: 201 });
}
