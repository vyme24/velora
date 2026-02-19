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

  await req.json().catch(() => null);

  await connectToDatabase();

  const user = await User.findById(auth.user._id);
  if (!user?.subscription?.stripeCustomerId) {
    return fail("No stripe customer linked", 404);
  }

  const stripe = getStripeClient();
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/billing`;

  const session = await stripe.billingPortal.sessions.create({
    customer: user.subscription.stripeCustomerId,
    return_url: returnUrl
  });

  return ok({ portalUrl: session.url });
}
