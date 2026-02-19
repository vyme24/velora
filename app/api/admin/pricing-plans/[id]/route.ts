import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdminActor } from "@/lib/admin-auth";
import { fail, ok } from "@/lib/http";
import { verifyCsrf } from "@/lib/csrf";
import { PricingPlan } from "@/models/PricingPlan";

const updateSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  badge: z.string().max(80).optional(),
  amount: z.number().int().positive().optional(),
  currency: z.string().min(3).max(10).optional(),
  coins: z.number().int().min(0).optional(),
  extra: z.number().int().min(0).max(1000).optional(),
  subscriptionKey: z.enum(["gold", "platinum"]).optional().nullable(),
  stripePriceId: z.string().max(200).optional().nullable(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(10000).optional()
});

type Params = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { superOnly: true });
  if ("response" in auth) return auth.response;

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return fail(parsed.error.issues[0]?.message || "Invalid request", 422);

  const patch: Record<string, unknown> = { ...parsed.data };
  if (typeof patch.currency === "string") patch.currency = String(patch.currency).toLowerCase();

  const updated = await PricingPlan.findByIdAndUpdate(params.id, { $set: patch }, { new: true });
  if (!updated) return fail("Plan not found", 404);
  return ok({ plan: updated });
}

export async function DELETE(req: NextRequest, { params }: Params) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAdminActor(req, { superOnly: true });
  if ("response" in auth) return auth.response;

  const deleted = await PricingPlan.findByIdAndDelete(params.id);
  if (!deleted) return fail("Plan not found", 404);
  return ok({ deleted: true });
}
