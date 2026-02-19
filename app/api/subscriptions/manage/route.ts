import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { connectToDatabase } from "@/lib/db";
import { setInternalSubscriptionCancelState, setInternalVipCancelState } from "@/lib/subscriptions";

type Body = {
  target?: "subscription" | "vip";
  cancelAtPeriodEnd?: boolean;
};

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const body = (await req.json()) as Body;
  const target = body.target || "subscription";
  const cancelAtPeriodEnd = Boolean(body.cancelAtPeriodEnd);

  await connectToDatabase();

  if (target === "vip") {
    const updated = await setInternalVipCancelState(String(auth.user._id), cancelAtPeriodEnd);
    if (!updated) return fail("No active internal VIP subscription", 404);
    return ok({
      target: "vip",
      status: updated.vip?.status || "none",
      cancelAtPeriodEnd: Boolean(updated.vip?.cancelAtPeriodEnd),
      currentPeriodEnd: updated.vip?.currentPeriodEnd || null
    });
  }

  const updated = await setInternalSubscriptionCancelState(String(auth.user._id), cancelAtPeriodEnd);
  if (!updated) return fail("No active internal subscription", 404);

  return ok({
    target: "subscription",
    status: updated.subscription?.status || "none",
    cancelAtPeriodEnd: Boolean(updated.subscription?.cancelAtPeriodEnd),
    currentPeriodEnd: updated.subscription?.currentPeriodEnd || null
  });
}
