import { randomUUID } from "crypto";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { CoinLedger } from "@/models/CoinLedger";
import { getSubscriptionPlanByKey } from "@/lib/pricing";
import { generateInvoiceId } from "@/lib/payment-invoice";

const BILLING_CYCLE_DAYS = 30;

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function createReference(prefix: string) {
  return `${prefix}_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

export async function activateInternalSubscription(userId: string, plan: "gold" | "platinum") {
  const user = await User.findById(userId);
  if (!user) return null;

  const pricingPlan = await getSubscriptionPlanByKey(plan);
  if (!pricingPlan) return null;

  const now = new Date();
  const periodEnd = addDays(now, BILLING_CYCLE_DAYS);

  user.subscriptionPlan = plan;
  user.subscription = {
    provider: "internal",
    status: "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    monthlyAmount: pricingPlan.amount,
    currency: (pricingPlan.currency || "usd").toLowerCase(),
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false
  };
  await user.save();

  const payment = await Payment.create({
    userId: user._id,
    provider: "internal",
    type: "subscription",
    amount: pricingPlan.amount,
    currency: (pricingPlan.currency || "usd").toLowerCase(),
    status: "succeeded",
    invoiceId: generateInvoiceId("SUB"),
    referenceId: createReference("sub"),
    subscriptionPlan: plan,
    metadata: {
      mode: "internal_subscription",
      cycleType: "activation",
      cycleKey: `sub:${String(user._id)}:${plan}:${now.toISOString()}`
    },
    paidAt: now
  });

  return { user, payment };
}

export async function setInternalSubscriptionCancelState(userId: string, cancelAtPeriodEnd: boolean) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (user.subscriptionPlan === "free" || user.subscription?.status !== "active") return null;

  user.subscription = {
    provider: "internal",
    status: "active",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    monthlyAmount: user.subscription?.monthlyAmount || 0,
    currency: user.subscription?.currency || "usd",
    currentPeriodStart: user.subscription?.currentPeriodStart || null,
    currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
    cancelAtPeriodEnd
  };
  await user.save();
  return user;
}

export async function activateInternalVip(params: {
  userId: string;
  packageId: string;
  amount: number;
  currency: string;
  totalCoins: number;
  baseCoins: number;
  bonusCoins: number;
  bonusPercent: number;
  offerCode?: string | null;
}) {
  const user = await User.findById(params.userId);
  if (!user) return null;

  const now = new Date();
  const periodEnd = addDays(now, BILLING_CYCLE_DAYS);

  user.vip = {
    provider: "internal",
    enabled: true,
    status: "active",
    bonusPercent: params.bonusPercent,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    packageId: params.packageId,
    monthlyAmount: params.amount,
    monthlyCoins: params.totalCoins,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    cancelAtPeriodEnd: false
  };
  user.coins += params.totalCoins;
  await user.save();

  const payment = await Payment.create({
    userId: user._id,
    provider: "internal",
    type: "subscription",
    amount: params.amount,
    currency: params.currency,
    status: "succeeded",
    invoiceId: generateInvoiceId("VIP"),
    referenceId: createReference("vip"),
    packageId: params.packageId,
    coinsAdded: params.totalCoins,
    metadata: {
      mode: "vip_coin_subscription",
      cycleType: "activation",
      offerCode: params.offerCode || null,
      baseCoins: params.baseCoins,
      bonusCoins: params.bonusCoins,
      bonusPercent: params.bonusPercent,
      cycleKey: `vip:${String(user._id)}:${params.packageId}:${now.toISOString()}`
    },
    paidAt: now
  });

  await CoinLedger.create({
    userId: user._id,
    delta: params.totalCoins,
    balanceAfter: user.coins,
    reason: "purchase",
    paymentId: payment._id,
    metadata: {
      mode: "vip_coin_subscription",
      packageId: params.packageId
    }
  });

  return { user, payment };
}

export async function setInternalVipCancelState(userId: string, cancelAtPeriodEnd: boolean) {
  const user = await User.findById(userId);
  if (!user) return null;
  if (!user.vip?.enabled || user.vip.status !== "active") return null;

  user.vip = {
    provider: "internal",
    enabled: true,
    status: "active",
    bonusPercent: user.vip.bonusPercent || 15,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    packageId: user.vip.packageId || null,
    monthlyAmount: user.vip.monthlyAmount || 0,
    monthlyCoins: user.vip.monthlyCoins || 0,
    currentPeriodStart: user.vip.currentPeriodStart || null,
    currentPeriodEnd: user.vip.currentPeriodEnd || null,
    cancelAtPeriodEnd
  };
  await user.save();
  return user;
}

export async function runInternalSubscriptionRenewals() {
  const now = new Date();
  let renewed = 0;
  let canceled = 0;
  let vipRenewed = 0;
  let vipCanceled = 0;
  let skipped = 0;

  const dueSubscriptions = await User.find({
    subscriptionPlan: { $in: ["gold", "platinum"] },
    "subscription.provider": "internal",
    "subscription.status": "active",
    "subscription.currentPeriodEnd": { $lte: now }
  });

  for (const user of dueSubscriptions) {
    if (user.subscription?.cancelAtPeriodEnd) {
      user.subscriptionPlan = "free";
      user.subscription = {
        provider: "internal",
        status: "canceled",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        monthlyAmount: user.subscription?.monthlyAmount || 0,
        currency: user.subscription?.currency || "usd",
        currentPeriodStart: user.subscription?.currentPeriodStart || null,
        currentPeriodEnd: user.subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: true
      };
      await user.save();
      canceled += 1;
      continue;
    }

    const cycleStart = user.subscription?.currentPeriodEnd || now;
    const cycleKey = `sub:${String(user._id)}:${user.subscriptionPlan}:${cycleStart.toISOString()}`;
    const exists = await Payment.exists({
      userId: user._id,
      provider: "internal",
      type: "subscription",
      "metadata.cycleKey": cycleKey
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    await Payment.create({
      userId: user._id,
      provider: "internal",
      type: "subscription",
      amount: user.subscription?.monthlyAmount || 0,
      currency: user.subscription?.currency || "usd",
      status: "succeeded",
      invoiceId: generateInvoiceId("SUB"),
      referenceId: createReference("sub"),
      subscriptionPlan: user.subscriptionPlan,
      metadata: {
        mode: "internal_subscription",
        cycleType: "renewal",
        cycleKey
      },
      paidAt: now
    });

    user.subscription = {
      provider: "internal",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      monthlyAmount: user.subscription?.monthlyAmount || 0,
      currency: user.subscription?.currency || "usd",
      currentPeriodStart: cycleStart,
      currentPeriodEnd: addDays(cycleStart, BILLING_CYCLE_DAYS),
      cancelAtPeriodEnd: false
    };
    await user.save();
    renewed += 1;
  }

  const dueVip = await User.find({
    "vip.provider": "internal",
    "vip.enabled": true,
    "vip.status": "active",
    "vip.currentPeriodEnd": { $lte: now }
  });

  for (const user of dueVip) {
    if (user.vip?.cancelAtPeriodEnd) {
      user.vip = {
        provider: "internal",
        enabled: false,
        status: "canceled",
        bonusPercent: user.vip?.bonusPercent || 15,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        packageId: user.vip?.packageId || null,
        monthlyAmount: user.vip?.monthlyAmount || 0,
        monthlyCoins: user.vip?.monthlyCoins || 0,
        currentPeriodStart: user.vip?.currentPeriodStart || null,
        currentPeriodEnd: user.vip?.currentPeriodEnd || null,
        cancelAtPeriodEnd: true
      };
      await user.save();
      vipCanceled += 1;
      continue;
    }

    const cycleStart = user.vip?.currentPeriodEnd || now;
    const cycleKey = `vip:${String(user._id)}:${user.vip?.packageId || "package"}:${cycleStart.toISOString()}`;
    const exists = await Payment.exists({
      userId: user._id,
      provider: "internal",
      type: "subscription",
      "metadata.cycleKey": cycleKey
    });
    if (exists) {
      skipped += 1;
      continue;
    }

    const monthlyCoins = user.vip?.monthlyCoins || 0;
    if (monthlyCoins > 0) {
      user.coins += monthlyCoins;
    }

    const payment = await Payment.create({
      userId: user._id,
      provider: "internal",
      type: "subscription",
      amount: user.vip?.monthlyAmount || 0,
      currency: "usd",
      status: "succeeded",
      invoiceId: generateInvoiceId("VIP"),
      referenceId: createReference("vip"),
      packageId: user.vip?.packageId || null,
      coinsAdded: monthlyCoins,
      metadata: {
        mode: "vip_coin_subscription",
        cycleType: "renewal",
        cycleKey
      },
      paidAt: now
    });

    if (monthlyCoins > 0) {
      await CoinLedger.create({
        userId: user._id,
        delta: monthlyCoins,
        balanceAfter: user.coins,
        reason: "purchase",
        paymentId: payment._id,
        metadata: {
          mode: "vip_coin_subscription_renewal",
          packageId: user.vip?.packageId || null
        }
      });
    }

    user.vip = {
      provider: "internal",
      enabled: true,
      status: "active",
      bonusPercent: user.vip?.bonusPercent || 15,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      packageId: user.vip?.packageId || null,
      monthlyAmount: user.vip?.monthlyAmount || 0,
      monthlyCoins: user.vip?.monthlyCoins || 0,
      currentPeriodStart: cycleStart,
      currentPeriodEnd: addDays(cycleStart, BILLING_CYCLE_DAYS),
      cancelAtPeriodEnd: false
    };
    await user.save();
    vipRenewed += 1;
  }

  return { renewed, canceled, vipRenewed, vipCanceled, skipped };
}
