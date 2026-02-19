import { NextRequest } from "next/server";
import Stripe from "stripe";
import { fail, ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { connectToDatabase } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import { Payment } from "@/models/Payment";
import { User } from "@/models/User";
import { CoinLedger } from "@/models/CoinLedger";
import { Transaction } from "@/models/Transaction";
import { generateInvoiceId } from "@/lib/payment-invoice";

async function applyCoinCredit(session: Stripe.Checkout.Session, userId: string) {
  const metadata = (session.metadata || {}) as { coins?: string; packageId?: string };
  const coins = Number(metadata.coins || 0);
  if (!Number.isFinite(coins) || coins <= 0) return null;

  const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
  if (!payment) return null;
  if (payment.status === "succeeded") {
    const user = await User.findById(userId).select("coins");
    return { alreadyApplied: true, coins: user?.coins ?? 0 };
  }

  const user = await User.findById(userId);
  if (!user) return null;

  user.coins += coins;
  await user.save();

  payment.status = "succeeded";
  if (!payment.invoiceId) payment.invoiceId = generateInvoiceId("COIN");
  payment.paidAt = new Date();
  payment.stripePaymentIntentId =
    typeof session.payment_intent === "string" ? session.payment_intent : payment.stripePaymentIntentId;
  await payment.save();

  await CoinLedger.create({
    userId: user._id,
    delta: coins,
    balanceAfter: user.coins,
    reason: "purchase",
    paymentId: payment._id,
    metadata: {
      packageId: metadata.packageId || payment.packageId || null,
      sourceId: session.id,
      source: "confirm_session"
    }
  });

  await Transaction.updateOne({ stripeSessionId: session.id }, { $set: { status: "succeeded" } });
  return { alreadyApplied: false, coins: user.coins };
}

export async function POST(req: NextRequest) {
  if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const body = (await req.json()) as { sessionId?: string };
  if (!body?.sessionId) return fail("sessionId is required", 422);

  await connectToDatabase();
  const stripe = getStripeClient();
  let session: Stripe.Checkout.Session;

  try {
    session = await stripe.checkout.sessions.retrieve(body.sessionId, { expand: ["subscription"] });
  } catch {
    return fail("Unable to verify checkout session", 404);
  }

  const metadata = (session.metadata || {}) as { userId?: string; mode?: string };
  if (!metadata.userId || String(metadata.userId) !== String(auth.user._id)) {
    return fail("This checkout session does not belong to your account", 403);
  }

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return ok({
      confirmed: false,
      status: session.status,
      paymentStatus: session.payment_status
    });
  }

  if (metadata.mode === "coins" || metadata.mode === "coin") {
    const applied = await applyCoinCredit(session, String(auth.user._id));
    if (!applied) return fail("Unable to apply coin credit for this session", 422);
    return ok({
      confirmed: true,
      mode: "coins",
      alreadyApplied: applied.alreadyApplied,
      coins: applied.coins
    });
  }

  const payment = await Payment.findOne({ stripeCheckoutSessionId: session.id });
  if (payment && payment.status !== "succeeded") {
    payment.status = "succeeded";
    if (!payment.invoiceId) payment.invoiceId = generateInvoiceId("SUB");
    payment.paidAt = new Date();
    if (typeof session.subscription === "string") payment.stripeSubscriptionId = session.subscription;
    await payment.save();
  }
  await Transaction.updateOne({ stripeSessionId: session.id }, { $set: { status: "succeeded" } });

  return ok({
    confirmed: true,
    mode: metadata.mode || "subscription"
  });
}
