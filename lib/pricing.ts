import { PricingPlan } from "@/models/PricingPlan";

export const DEFAULT_COIN_PACKAGES = [
  { key: "starter_290", label: "Starter Pack", badge: "Limited", amount: 499, coins: 290, extra: 0, sortOrder: 10 },
  { key: "basic_700", label: "Basic", badge: "Basic", amount: 1199, coins: 700, extra: 10, sortOrder: 20 },
  { key: "elite_1040", label: "Elite", badge: "Elite", amount: 2495, coins: 1040, extra: 20, sortOrder: 30 },
  { key: "bestseller_1760", label: "Bestseller", badge: "Bestseller", amount: 3995, coins: 1760, extra: 30, sortOrder: 40 },
  { key: "diamond_4160", label: "Diamond", badge: "Diamond", amount: 8995, coins: 4160, extra: 60, sortOrder: 50 }
] as const;

export const DEFAULT_SUBSCRIPTION_PLANS = [
  {
    key: "sub_gold",
    label: "Gold",
    badge: "Popular",
    amount: 1499,
    subscriptionKey: "gold" as const,
    sortOrder: 10,
    envPriceVar: "STRIPE_PRICE_GOLD"
  },
  {
    key: "sub_platinum",
    label: "Platinum",
    badge: "Best Value",
    amount: 2999,
    subscriptionKey: "platinum" as const,
    sortOrder: 20,
    envPriceVar: "STRIPE_PRICE_PLATINUM"
  }
] as const;

let pricingSeeded = false;

export async function ensureDefaultPricingPlans() {
  if (pricingSeeded) return;

  const existingCount = await PricingPlan.countDocuments();
  if (existingCount > 0) {
    pricingSeeded = true;
    return;
  }

  for (const pkg of DEFAULT_COIN_PACKAGES) {
    await PricingPlan.updateOne(
      { key: pkg.key },
      {
        $setOnInsert: {
          key: pkg.key,
          kind: "coin",
          label: pkg.label,
          badge: pkg.badge,
          amount: pkg.amount,
          currency: "usd",
          coins: pkg.coins,
          extra: pkg.extra,
          active: true,
          sortOrder: pkg.sortOrder
        }
      },
      { upsert: true }
    );
  }

  for (const plan of DEFAULT_SUBSCRIPTION_PLANS) {
    await PricingPlan.updateOne(
      { key: plan.key },
      {
        $setOnInsert: {
          key: plan.key,
          kind: "subscription",
          label: plan.label,
          badge: plan.badge,
          amount: plan.amount,
          currency: "usd",
          active: true,
          sortOrder: plan.sortOrder,
          subscriptionKey: plan.subscriptionKey,
          stripePriceId: process.env[plan.envPriceVar] || null
        }
      },
      { upsert: true }
    );
  }

  pricingSeeded = true;
}

export async function getActiveCoinPackages() {
  await ensureDefaultPricingPlans();
  return PricingPlan.find({ kind: "coin", active: true }).sort({ sortOrder: 1, amount: 1 });
}

export async function getActiveSubscriptionPlans() {
  await ensureDefaultPricingPlans();
  return PricingPlan.find({ kind: "subscription", active: true }).sort({ sortOrder: 1, amount: 1 });
}

export async function getCoinPackageByKey(key: string) {
  await ensureDefaultPricingPlans();
  return PricingPlan.findOne({ kind: "coin", active: true, key: key.toLowerCase() });
}

export async function getSubscriptionPlanByKey(subscriptionKey: "gold" | "platinum") {
  await ensureDefaultPricingPlans();
  return PricingPlan.findOne({ kind: "subscription", active: true, subscriptionKey });
}
