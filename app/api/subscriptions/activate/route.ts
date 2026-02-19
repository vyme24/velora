import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { connectToDatabase } from "@/lib/db";
import { activateInternalSubscription } from "@/lib/subscriptions";

type Body = {
  plan?: "gold" | "platinum";
};

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const body = (await req.json()) as Body;
  if (!body.plan || (body.plan !== "gold" && body.plan !== "platinum")) {
    return fail("Invalid subscription plan", 422);
  }

  await connectToDatabase();
  const activated = await activateInternalSubscription(String(auth.user._id), body.plan);
  if (!activated) return fail("Unable to activate subscription", 422);

  return ok({
    plan: body.plan,
    status: activated.user.subscription?.status || "none",
    currentPeriodEnd: activated.user.subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd: Boolean(activated.user.subscription?.cancelAtPeriodEnd)
  });
}
