import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { Payment } from "@/models/Payment";

export async function GET(req: NextRequest) {
  const auth = await requireAuthUser(req);
  if ("response" in auth) return auth.response;

  const payments = await Payment.find({ userId: auth.user._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .select("type amount currency status packageId coinsAdded subscriptionPlan createdAt paidAt");

  return ok({
    items: payments.map((payment) => ({
      id: String(payment._id),
      type: payment.type,
      amount: payment.amount,
      currency: payment.currency || "usd",
      status: payment.status,
      packageId: payment.packageId || null,
      coinsAdded: payment.coinsAdded || 0,
      subscriptionPlan: payment.subscriptionPlan || null,
      createdAt: payment.createdAt,
      paidAt: payment.paidAt || null
    }))
  });
}
