import Stripe from "stripe";
import type { HydratedDocument } from "mongoose";
import type { UserDocument } from "@/models/User";
let stripeClient: Stripe | null = null;

export function getStripeClient() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY environment variable");
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: "2025-02-24.acacia"
    });
  }

  return stripeClient;
}

export const COIN_PACKAGES: Record<
  string,
  { coins: number; amount: number; label?: string; badge?: string; extra?: number }
> = {
  starter_290: { coins: 290, amount: 499, label: "Starter Pack", badge: "Limited", extra: 0 },
  basic_700: { coins: 700, amount: 1199, label: "Basic", badge: "Basic", extra: 10 },
  elite_1040: { coins: 1040, amount: 2495, label: "Elite", badge: "Elite", extra: 20 },
  bestseller_1760: { coins: 1760, amount: 3995, label: "Bestseller", badge: "Bestseller", extra: 30 },
  diamond_4160: { coins: 4160, amount: 8995, label: "Diamond", badge: "Diamond", extra: 60 }
};

export const SUBSCRIPTION_PLANS = {
  gold: {
    key: "gold",
    label: "Gold",
    monthlyAmount: 1499,
    envPriceVar: "STRIPE_PRICE_GOLD"
  },
  platinum: {
    key: "platinum",
    label: "Platinum",
    monthlyAmount: 2999,
    envPriceVar: "STRIPE_PRICE_PLATINUM"
  }
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

export function getPlanPriceId(plan: SubscriptionPlanKey) {
  const priceId = process.env[SUBSCRIPTION_PLANS[plan].envPriceVar];
  return priceId || null;
}

export async function ensureStripeCustomerForUser(
  stripe: Stripe,
  user: HydratedDocument<UserDocument>
) {
  const existing = user.subscription?.stripeCustomerId;
  if (existing) return existing;

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: String(user._id) }
  });

  user.subscription = {
    ...(user.subscription || {}),
    provider: "stripe",
    status: user.subscription?.status || "none",
    cancelAtPeriodEnd: Boolean(user.subscription?.cancelAtPeriodEnd),
    stripeCustomerId: customer.id
  };
  await user.save();

  return customer.id;
}
