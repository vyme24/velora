import { NextRequest } from "next/server";
import { requireAdminActor } from "@/lib/admin-auth";
import { ok } from "@/lib/http";
import { Payment } from "@/models/Payment";

const allowedStatuses = new Set(["pending", "succeeded", "failed", "refunded", "canceled"]);

export async function GET(req: NextRequest) {
  const auth = await requireAdminActor(req, { permission: "view_payments" });
  if ("response" in auth) return auth.response;

  const status = (req.nextUrl.searchParams.get("status") || "all").toLowerCase();
  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

  const baseFilter: Record<string, unknown> = {};
  if (allowedStatuses.has(status)) baseFilter.status = status;

  const rows = await Payment.find(baseFilter)
    .populate("userId", "name email")
    .sort({ paidAt: -1, createdAt: -1 })
    .limit(500);

  const items = rows
    .map((payment) => {
      const user = payment.userId as unknown as { name?: string; email?: string } | null;
      return {
        _id: String(payment._id),
        type: payment.type,
        amount: payment.amount,
        currency: payment.currency || "usd",
        status: payment.status,
        provider: payment.provider,
        invoiceId: payment.invoiceId || payment.stripeInvoiceId || payment.referenceId,
        referenceId: payment.referenceId,
        packageId: payment.packageId || null,
        coinsAdded: payment.coinsAdded || 0,
        subscriptionPlan: payment.subscriptionPlan || null,
        stripeCheckoutSessionId: payment.stripeCheckoutSessionId || null,
        stripePaymentIntentId: payment.stripePaymentIntentId || null,
        stripeInvoiceId: payment.stripeInvoiceId || null,
        stripeSubscriptionId: payment.stripeSubscriptionId || null,
        paidAt: payment.paidAt,
        createdAt: payment.createdAt,
        metadata: payment.metadata || {},
        user: {
          name: user?.name || "Unknown",
          email: user?.email || ""
        }
      };
    })
    .filter((row) => {
      if (!q) return true;
      const hay = `${row.user.name} ${row.user.email} ${row.invoiceId || ""} ${row.referenceId} ${row.type} ${row.status} ${row.provider}`.toLowerCase();
      return hay.includes(q);
    });

  const stats = items.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.status === "succeeded") {
        acc.succeeded += 1;
        acc.revenueCents += row.amount;
      }
      if (row.status === "pending") acc.pending += 1;
      if (row.status === "failed") acc.failed += 1;
      return acc;
    },
    { total: 0, succeeded: 0, pending: 0, failed: 0, revenueCents: 0 }
  );

  return ok({ items, stats, actorRole: auth.actor.role });
}
