import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { getStripeClient } from "@/lib/stripe";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { User } from "@/models/User";

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;
  const body = (await req.json()) as { cancelAtPeriodEnd?: boolean };

  await connectToDatabase();

  const user = await User.findById(auth.user._id);
  if (!user?.subscription?.stripeSubscriptionId) {
    return fail("No active subscription", 404);
  }

  const stripe = getStripeClient();

  const updated = await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
    cancel_at_period_end: body.cancelAtPeriodEnd ?? true
  });

  user.subscription.cancelAtPeriodEnd = updated.cancel_at_period_end;
  user.subscription.status = updated.status;
  user.subscription.currentPeriodEnd = new Date(updated.current_period_end * 1000);
  await user.save();

  return ok({
    subscriptionId: updated.id,
    status: updated.status,
    cancelAtPeriodEnd: updated.cancel_at_period_end,
    currentPeriodEnd: updated.current_period_end
  });
}
