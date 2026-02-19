import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { fail, ok } from "@/lib/http";
import { ensureStripeCustomerForUser, getStripeClient } from "@/lib/stripe";
import { getLimitedOfferSettings } from "@/lib/app-settings";
import { getCoinPackageByKey, getSubscriptionPlanByKey } from "@/lib/pricing";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { User } from "@/models/User";
import { Payment } from "@/models/Payment";
import { Transaction } from "@/models/Transaction";
import { activateInternalSubscription, activateInternalVip } from "@/lib/subscriptions";
import { generateInvoiceId } from "@/lib/payment-invoice";

type CheckoutBody = {
  userId?: string;
  mode?: "coin" | "coins" | "subscription";
  packageId?: string;
  plan?: "gold" | "platinum";
  vipEnabled?: boolean;
  offerCode?: string;
};

async function resolveCoinOffer(offerCode: string | undefined) {
  if (!offerCode) return null;
  const limitedOffer = await getLimitedOfferSettings();
  if (!limitedOffer.enabled) return null;
  if (offerCode === limitedOffer.code) {
    return {
      code: limitedOffer.code,
      label: limitedOffer.label,
      amount: limitedOffer.amountCents,
      coins: limitedOffer.coins,
      currency: (limitedOffer.currency || "USD").toLowerCase()
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

  if (body.mode === "coin" || body.mode === "coins") {
    if (!body.packageId) return fail("Invalid coin package", 422);

    const pkg = await getCoinPackageByKey(body.packageId);
    if (!pkg) return fail("Coin package not found", 404);

    const offer = await resolveCoinOffer(body.offerCode);
    const vipEnabled = offer ? false : Boolean(body.vipEnabled);
    const bonusPercent = vipEnabled ? 15 : 0;
    const baseCoins = offer ? offer.coins : pkg.coins || 0;
    const bonusCoins = vipEnabled ? Math.floor(baseCoins * (bonusPercent / 100)) : 0;
    const totalCoins = baseCoins + bonusCoins;
    const chargeAmount = offer ? offer.amount : pkg.amount;
    const currency = (offer?.currency || pkg.currency || "usd").toLowerCase();

    if (vipEnabled) {
      const activated = await activateInternalVip({
        userId: String(user._id),
        packageId: pkg.key,
        amount: chargeAmount,
        currency,
        totalCoins,
        baseCoins,
        bonusCoins,
        bonusPercent,
        offerCode: offer?.code || null
      });

      if (!activated) return fail("Unable to activate VIP recurring plan", 422);

      return ok({
        internalProcessed: true,
        mode: "vip_coin_subscription",
        coins: activated.user.coins,
        vip: {
          enabled: activated.user.vip?.enabled || false,
          status: activated.user.vip?.status || "none",
          currentPeriodEnd: activated.user.vip?.currentPeriodEnd || null,
          cancelAtPeriodEnd: Boolean(activated.user.vip?.cancelAtPeriodEnd)
        }
      });
    }

    const stripe = getStripeClient();
    const stripeCustomerId = await ensureStripeCustomerForUser(stripe, user);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const productLabel = offer ? offer.label : `${baseCoins} Velora Coins`;

    const session = await stripe.checkout.sessions.create({
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
            currency,
            product_data: { name: productLabel },
            unit_amount: chargeAmount
          },
          quantity: 1
        }
      ],
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`
    });

    await Payment.create({
      userId: user._id,
      provider: "stripe",
      type: "coin",
      amount: chargeAmount,
      currency,
      status: "pending",
      invoiceId: generateInvoiceId("COIN"),
      referenceId: `cs_${session.id}`,
      stripeCheckoutSessionId: session.id,
      packageId: pkg.key,
      coinsAdded: totalCoins,
      metadata: {
        userId: String(user._id),
        packageId: pkg.key,
        offerCode: offer?.code || null,
        vipEnabled: false,
        bonusPercent,
        bonusCoins
      }
    });

    await Transaction.create({
      userId: user._id,
      stripeSessionId: session.id,
      amount: chargeAmount,
      type: "coins",
      status: "pending"
    });

    return ok({ checkoutUrl: session.url, sessionId: session.id });
  }

  if (!body.plan || (body.plan !== "gold" && body.plan !== "platinum")) {
    return fail("Invalid subscription plan", 422);
  }

  const subscriptionPlan = await getSubscriptionPlanByKey(body.plan);
  if (!subscriptionPlan) return fail("Subscription plan not found", 404);

  const activated = await activateInternalSubscription(String(user._id), body.plan);
  if (!activated) return fail("Unable to activate subscription", 422);

  return ok({
    internalProcessed: true,
    mode: "subscription",
    plan: body.plan,
    subscription: {
      status: activated.user.subscription?.status || "none",
      currentPeriodEnd: activated.user.subscription?.currentPeriodEnd || null,
      cancelAtPeriodEnd: Boolean(activated.user.subscription?.cancelAtPeriodEnd)
    },
    payment: {
      id: String(activated.payment._id),
      amount: subscriptionPlan.amount
    }
  });
}
