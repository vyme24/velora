import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { connectToDatabase } from "@/lib/db";
import { setInternalSubscriptionCancelState } from "@/lib/subscriptions";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const body = (await req.json()) as { cancelAtPeriodEnd?: boolean };
  await connectToDatabase();

  const updated = await setInternalSubscriptionCancelState(
    String(auth.user._id),
    body.cancelAtPeriodEnd ?? true
  );
  if (!updated) return fail("No active internal subscription", 404);

  return ok({
    status: updated.subscription?.status || "none",
    cancelAtPeriodEnd: Boolean(updated.subscription?.cancelAtPeriodEnd),
    currentPeriodEnd: updated.subscription?.currentPeriodEnd || null
  });
}
