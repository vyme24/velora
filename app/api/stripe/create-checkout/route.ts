import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import {
  ensureStripeCustomerForUser,
  getStripeClient
} from "@/lib/stripe";
import { getCoinPackageByKey, getSubscriptionPlanByKey } from "@/lib/pricing";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import { Transaction } from "@/models/Transaction";

type CheckoutBody = {
  userId?: string;
  mode?: "coin" | "coins" | "subscription";
  packageId?: string;
  plan?: "gold" | "platinum";
  vipEnabled?: boolean;
  offerCode?: string;
};

function resolveCoinOffer(offerCode: string | undefined, pkg: { amount: number }) {
  if (!offerCode) return null;
  if (offerCode === "limited_700_499" && pkg.amount === 499) {
    return {
      code: "limited_700_499",
      label: "Limited Offer DOUBLE",
      amount: 499,
      coins: 700
    };
  }
  return null;
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const body = (await req.json()) as CheckoutBody;
  if (!body?.mode) return fail("mode is required", 422);

  await connectToDatabase();
  const user = await User.findById(auth.user._id);
  if (!user) return fail("User not found", 404);

  const stripe = getStripeClient();
  const stripeCustomerId = await ensureStripeCustomerForUser(stripe, user);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (body.mode === "coin" || body.mode === "coins") {
    if (!body.packageId) {
      return fail("Invalid coin package", 422);
    }

    const pkg = await getCoinPackageByKey(body.packageId);
    if (!pkg) return fail("Coin package not found", 404);

    const offer = resolveCoinOffer(body.offerCode, { amount: pkg.amount });
    const vipEnabled = offer ? false : Boolean(body.vipEnabled);
    const bonusPercent = vipEnabled ? 15 : 0;
    const baseCoins = offer ? offer.coins : pkg.coins || 0;
    const bonusCoins = vipEnabled ? Math.floor(baseCoins * (bonusPercent / 100)) : 0;
    const totalCoins = baseCoins + bonusCoins;
    const chargeAmount = offer ? offer.amount : pkg.amount;
    const productLabel = offer ? offer.label : `${baseCoins} Velora Coins`;

    const session = await stripe.checkout.sessions.create(
      vipEnabled
        ? {
            mode: "subscription",
            customer: stripeCustomerId,
            metadata: {
              userId: String(user._id),
              mode: "vip_coin_subscription",
              packageId: pkg.key,
              coins: String(totalCoins),
              baseCoins: String(baseCoins),
              bonusCoins: String(bonusCoins),
              bonusPercent: String(bonusPercent)
            },
            subscription_data: {
              metadata: {
                userId: String(user._id),
                mode: "vip_coin_subscription",
                packageId: pkg.key,
                coins: String(totalCoins),
                baseCoins: String(baseCoins),
                bonusCoins: String(bonusCoins),
                bonusPercent: String(bonusPercent)
              }
            },
            line_items: [
              {
                price_data: {
                  currency: (pkg.currency || "usd").toLowerCase(),
                  product_data: { name: `VIP ${offer ? offer.label : pkg.label || "Coin"} Plan` },
                  recurring: { interval: "month" },
                  unit_amount: chargeAmount
                },
                quantity: 1
              }
            ],
            success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/billing/cancel`
          }
        : {
            mode: "payment",
            payment_method_types: ["card"],
            customer: stripeCustomerId,
            metadata: {
              userId: String(user._id),
              mode: "coins",
              packageId: pkg.key,
              offerCode: offer?.code || "",
              coins: String(totalCoins),
              baseCoins: String(baseCoins),
              bonusCoins: String(bonusCoins),
              bonusPercent: String(bonusPercent)
            },
            line_items: [
              {
                price_data: {
                  currency: (pkg.currency || "usd").toLowerCase(),
                  product_data: { name: productLabel },
                  unit_amount: chargeAmount
                },
                quantity: 1
              }
            ],
            success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/billing/cancel`
          }
    );

    await Payment.create({
      userId: user._id,
      provider: "stripe",
      type: vipEnabled ? "subscription" : "coin",
      amount: chargeAmount,
      currency: (pkg.currency || "usd").toLowerCase(),
      status: "pending",
      referenceId: `cs_${session.id}`,
      stripeCheckoutSessionId: session.id,
      packageId: pkg.key,
      coinsAdded: totalCoins,
      metadata: {
        userId: String(user._id),
        packageId: pkg.key,
        offerCode: offer?.code || null,
        vipEnabled,
        bonusPercent,
        bonusCoins
      }
    });

    await Transaction.create({
      userId: user._id,
      stripeSessionId: session.id,
      amount: chargeAmount,
      type: vipEnabled ? "subscription" : "coins",
      status: "pending"
    });

    return ok({ checkoutUrl: session.url, sessionId: session.id });
  }

  if (!body.plan || (body.plan !== "gold" && body.plan !== "platinum")) {
    return fail("Invalid subscription plan", 422);
  }

  const subscriptionPlan = await getSubscriptionPlanByKey(body.plan);
  if (!subscriptionPlan) return fail("Subscription plan not found", 404);

  const priceId = subscriptionPlan.stripePriceId;
  if (!priceId) return fail(`Missing Stripe price ID for ${body.plan} plan`, 500);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer: stripeCustomerId,
    metadata: {
      userId: String(user._id),
      mode: "subscription",
      plan: body.plan
    },
    subscription_data: {
      metadata: {
        userId: String(user._id),
        plan: body.plan
      }
    },
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/billing/cancel`
  });

  await Payment.create({
    userId: user._id,
    provider: "stripe",
    type: "subscription",
    amount: subscriptionPlan.amount,
    currency: (subscriptionPlan.currency || "usd").toLowerCase(),
    status: "pending",
    referenceId: `cs_${session.id}`,
    stripeCheckoutSessionId: session.id,
    subscriptionPlan: body.plan,
    metadata: { userId: String(user._id), plan: body.plan, pricingPlanId: String(subscriptionPlan._id) }
  });

  await Transaction.create({
    userId: user._id,
    stripeSessionId: session.id,
    amount: subscriptionPlan.amount,
    type: "subscription",
    status: "pending"
  });

  return ok({ checkoutUrl: session.url, sessionId: session.id });
}
