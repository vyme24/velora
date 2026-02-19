import Stripe from "stripe";
import { NextRequest } from "next/server";
import { getStripeClient } from "@/lib/stripe";
import { fail, ok } from "@/lib/http";
import { connectToDatabase } from "@/lib/db";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { CoinLedger } from "@/models/CoinLedger";
import { StripeEvent } from "@/models/StripeEvent";
import { Transaction } from "@/models/Transaction";
import { paymentConfirmationTemplate, sendEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type StripeMetadata = {
  userId?: string;
  mode?: "coin" | "coins" | "subscription" | "vip_coin_subscription";
  packageId?: string;
  coins?: string;
  baseCoins?: string;
  bonusCoins?: string;
  bonusPercent?: string;
  plan?: "gold" | "platinum";
};

async function grantCoinsToUser(params: {
  userId: string;
  coins: number;
  paymentId?: string;
  packageId?: string;
  sessionOrInvoiceId: string;
}) {
  const user = await User.findById(params.userId);
  if (!user) return null;

  user.coins += params.coins;
  await user.save();

  await CoinLedger.create({
    userId: user._id,
    delta: params.coins,
    balanceAfter: user.coins,
    reason: "purchase",
    paymentId: params.paymentId || null,
    metadata: {
      packageId: params.packageId || null,
      sourceId: params.sessionOrInvoiceId
    }
  });

  return user;
}

async function markEventProcessed(event: Stripe.Event) {
  await StripeEvent.create({
    eventId: event.id,
    eventType: event.type,
    payload: event
  });
}

async function hasEventProcessed(eventId: string) {
  const existing = await StripeEvent.findOne({ eventId });
  return Boolean(existing);
}

async function handleCoinCheckout(session: Stripe.Checkout.Session) {
  const metadata = (session.metadata || {}) as StripeMetadata;
  if ((metadata.mode !== "coin" && metadata.mode !== "coins") || !metadata.userId || !metadata.packageId || !metadata.coins) return;

  const coins = Number(metadata.coins);
  if (!Number.isFinite(coins) || coins <= 0) return;

  const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
  if (!payment || payment.status === "succeeded") return;

  const user = await grantCoinsToUser({
    userId: metadata.userId,
    coins,
    paymentId: String(payment._id),
    packageId: metadata.packageId,
    sessionOrInvoiceId: session.id
  });
  if (!user) return;

  payment.status = "succeeded";
  payment.paidAt = new Date();
  payment.stripePaymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : payment.stripePaymentIntentId;
  await payment.save();

  await Transaction.updateOne(
    { stripeSessionId: session.id },
    { $set: { status: "succeeded" } }
  );

  await sendEmail({
    to: user.email,
    subject: "Velora coin purchase confirmed",
    html: paymentConfirmationTemplate(user.name, `$${(payment.amount / 100).toFixed(2)}`, `${coins} coins were added to your account.`)
  });
}

async function upsertVipFromStripe(subscription: Stripe.Subscription, fallbackUserId?: string) {
  const metadata = (subscription.metadata || {}) as StripeMetadata;
  let user = null;
  const userId = metadata.userId || fallbackUserId;

  if (userId) user = await User.findById(userId);
  if (!user && typeof subscription.customer === "string") {
    user = await User.findOne({ "vip.stripeCustomerId": subscription.customer });
  }
  if (!user && subscription.id) {
    user = await User.findOne({ "vip.stripeSubscriptionId": subscription.id });
  }
  if (!user) return null;

  const bonusPercent = Number(metadata.bonusPercent || 15);
  const monthlyCoins = Number(metadata.coins || 0);

  user.vip = {
    enabled: subscription.status === "active" || subscription.status === "trialing",
    status: subscription.status,
    bonusPercent: Number.isFinite(bonusPercent) ? bonusPercent : 15,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
    stripeSubscriptionId: subscription.id,
    packageId: metadata.packageId || null,
    monthlyAmount: subscription.items.data[0]?.price?.unit_amount || user.vip?.monthlyAmount || 0,
    monthlyCoins: Number.isFinite(monthlyCoins) ? monthlyCoins : user.vip?.monthlyCoins || 0,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  };

  await user.save();
  return user;
}

async function upsertSubscriptionFromStripe(subscription: Stripe.Subscription, fallbackUserId?: string) {
  const metadata = (subscription.metadata || {}) as StripeMetadata;
  let user = null;
  const userId = metadata.userId || fallbackUserId;
  if (userId) {
    user = await User.findById(userId);
  }
  if (!user && typeof subscription.customer === "string") {
    user = await User.findOne({ "subscription.stripeCustomerId": subscription.customer });
  }
  if (!user && subscription.id) {
    user = await User.findOne({ "subscription.stripeSubscriptionId": subscription.id });
  }
  if (!user) return;

  const plan = (metadata.plan || "gold") as "gold" | "platinum";

  user.subscriptionPlan = subscription.status === "active" || subscription.status === "trialing" ? plan : "free";
  user.subscription = {
    provider: "stripe",
    status: subscription.status,
    stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
    stripeSubscriptionId: subscription.id,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end
  };

  await user.save();
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = (session.metadata || {}) as StripeMetadata;

  if (metadata.mode === "coin" || metadata.mode === "coins") {
    await handleCoinCheckout(session);
    return;
  }

  if (metadata.mode === "vip_coin_subscription" && session.subscription) {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await upsertVipFromStripe(subscription, metadata.userId);

    const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
    if (payment) {
      payment.status = "succeeded";
      payment.paidAt = new Date();
      payment.stripeSubscriptionId = subscription.id;
      await payment.save();
    }

    await Transaction.updateOne({ stripeSessionId: session.id }, { $set: { status: "succeeded" } });
    return;
  }

  if (metadata.mode === "subscription" && session.subscription) {
    const stripe = getStripeClient();
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);

    await upsertSubscriptionFromStripe(subscription, metadata.userId);

    const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
    if (payment) {
      payment.status = "succeeded";
      payment.paidAt = new Date();
      payment.stripeSubscriptionId = subscription.id;
      await payment.save();
    }

    await Transaction.updateOne(
      { stripeSessionId: session.id },
      { $set: { status: "succeeded" } }
    );
  }
}

async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
  const metadata = (subscription.metadata || {}) as StripeMetadata;

  if (metadata.mode === "vip_coin_subscription") {
    const user = await upsertVipFromStripe(subscription);
    if (!user) return;

    const existingVipPayment = await Payment.findOne({ stripeInvoiceId: invoice.id });
    if (existingVipPayment) return;

    const vipCoins = Number(metadata.coins || 0);
    const grantedUser = await grantCoinsToUser({
      userId: String(user._id),
      coins: vipCoins,
      packageId: metadata.packageId,
      sessionOrInvoiceId: `in_${invoice.id}`
    });
    if (!grantedUser) return;

    await Payment.create({
      userId: user._id,
      provider: "stripe",
      type: "subscription",
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: "succeeded",
      referenceId: `in_${invoice.id}`,
      stripeInvoiceId: invoice.id,
      stripeSubscriptionId: subscription.id,
      paidAt: new Date(),
      coinsAdded: vipCoins,
      metadata: {
        mode: "vip_coin_subscription",
        packageId: metadata.packageId,
        bonusPercent: Number(metadata.bonusPercent || 15),
        baseCoins: Number(metadata.baseCoins || 0),
        bonusCoins: Number(metadata.bonusCoins || 0),
        billingReason: invoice.billing_reason
      }
    });

    await Transaction.updateOne(
      { stripeSessionId: `in_${invoice.id}` },
      {
        $setOnInsert: {
          userId: user._id,
          stripeSessionId: `in_${invoice.id}`,
          amount: invoice.amount_paid,
          type: "subscription",
          status: "succeeded"
        }
      },
      { upsert: true }
    );

    await sendEmail({
      to: user.email,
      subject: "Velora VIP monthly coins delivered",
      html: paymentConfirmationTemplate(
        user.name,
        `$${(invoice.amount_paid / 100).toFixed(2)}`,
        `${vipCoins} VIP coins were added to your account.`
      )
    });
    return;
  }

  await upsertSubscriptionFromStripe(subscription);

  const payment = await Payment.findOne({ stripeInvoiceId: invoice.id });
  if (payment) {
    payment.status = "succeeded";
    payment.paidAt = new Date();
    await payment.save();
    if (payment.stripeCheckoutSessionId) {
      await Transaction.updateOne(
        { stripeSessionId: payment.stripeCheckoutSessionId },
        { $set: { status: "succeeded" } }
      );
    }
    return;
  }

  if (!metadata.userId) return;

  await Payment.create({
    userId: metadata.userId,
    provider: "stripe",
    type: "subscription",
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: "succeeded",
    referenceId: `in_${invoice.id}`,
    stripeInvoiceId: invoice.id,
    stripeSubscriptionId: subscription.id,
    subscriptionPlan: metadata.plan || "gold",
    paidAt: new Date(),
    metadata: {
      billingReason: invoice.billing_reason
    }
  });

  await Transaction.updateOne(
    { stripeSessionId: `in_${invoice.id}` },
    {
      $setOnInsert: {
        userId: metadata.userId,
        stripeSessionId: `in_${invoice.id}`,
        amount: invoice.amount_paid,
        type: "subscription",
        status: "succeeded"
      }
    },
    { upsert: true }
  );
}

async function handlePaymentIntentSucceeded(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  if (!paymentIntent.id) return;

  await Payment.updateOne(
    { stripePaymentIntentId: paymentIntent.id },
    { $set: { status: "succeeded", paidAt: new Date() } }
  );
}

async function handleInvoiceFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);

  const metadata = (subscription.metadata || {}) as StripeMetadata;
  if (metadata.mode === "vip_coin_subscription") {
    const vipQuery =
      metadata.userId
        ? { _id: metadata.userId }
        : typeof subscription.customer === "string"
          ? { "vip.stripeCustomerId": subscription.customer }
          : { "vip.stripeSubscriptionId": subscription.id };
    await User.updateOne(vipQuery, { $set: { "vip.status": "past_due" } });
    return;
  }
  if (!metadata.userId) return;

  await User.updateOne(
    { _id: metadata.userId },
    {
      $set: {
        "subscription.status": "past_due"
      }
    }
  );
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = (subscription.metadata || {}) as StripeMetadata;
  if (metadata.mode === "vip_coin_subscription") {
    await upsertVipFromStripe(subscription);
    return;
  }
  await upsertSubscriptionFromStripe(subscription);
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = (subscription.metadata || {}) as StripeMetadata;
  if (metadata.mode === "vip_coin_subscription") {
    const vipQuery =
      metadata.userId
        ? { _id: metadata.userId }
        : typeof subscription.customer === "string"
          ? { "vip.stripeCustomerId": subscription.customer }
          : { "vip.stripeSubscriptionId": subscription.id };

    await User.updateOne(vipQuery, {
      $set: {
        "vip.enabled": false,
        "vip.status": "canceled",
        "vip.currentPeriodEnd": new Date(subscription.current_period_end * 1000),
        "vip.cancelAtPeriodEnd": true
      }
    });
    return;
  }

  const query =
    metadata.userId
      ? { _id: metadata.userId }
      : typeof subscription.customer === "string"
        ? { "subscription.stripeCustomerId": subscription.customer }
        : { "subscription.stripeSubscriptionId": subscription.id };

  await User.updateOne(
    query,
    {
      $set: {
        subscriptionPlan: "free",
        "subscription.status": "canceled",
        "subscription.currentPeriodEnd": new Date(subscription.current_period_end * 1000),
        "subscription.cancelAtPeriodEnd": true
      }
    }
  );
}

export async function POST(req: NextRequest) {
  const stripe = getStripeClient();
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return fail("Missing webhook configuration", 400);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return fail("Invalid webhook signature", 400);
  }

  await connectToDatabase();

  if (await hasEventProcessed(event.id)) {
    return ok({ received: true, duplicate: true });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event);
      break;
    case "invoice.payment_succeeded":
    case "invoice.paid":
      await handleInvoicePaid(event);
      break;
    case "invoice.payment_failed":
      await handleInvoiceFailed(event);
      break;
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event);
      break;
    default:
      break;
  }

  await markEventProcessed(event);

  return ok({ received: true });
}
