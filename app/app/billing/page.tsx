"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { Toast } from "@/components/ui/toast";
import { useI18n } from "@/components/i18n-provider";

type Me = {
  subscriptionPlan: "free" | "gold" | "platinum";
  subscription?: {
    status?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | null;
  };
};

type PaymentHistoryItem = {
  id: string;
  type: "subscription" | "coin";
  amount: number;
  currency: string;
  status: string;
  packageId?: string | null;
  coinsAdded?: number;
  subscriptionPlan?: string | null;
  invoiceId?: string | null;
  referenceId?: string;
  createdAt?: string;
  paidAt?: string | null;
};

export default function AppBillingPage() {
  const { formatMoney, currency } = useI18n();
  const [me, setMe] = useState<Me | null>(null);
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [meRes, paymentsRes] = await Promise.all([
        apiFetch("/api/auth/me", { retryOn401: true }),
        apiFetch("/api/payments/me", { retryOn401: true })
      ]);
      const meJson = await meRes.json();
      const paymentsJson = await paymentsRes.json();
      if (meRes.ok) setMe(meJson.data);
      if (paymentsRes.ok) setPayments(paymentsJson.data?.items || []);
      setLoading(false);
    })();
  }, []);

  const planLabel = useMemo(() => {
    if (!me) return "Loading...";
    if (me.subscriptionPlan === "platinum") return "Platinum";
    if (me.subscriptionPlan === "gold") return "Gold";
    return "Free";
  }, [me]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 1800);
  }

  async function refreshMe() {
    const res = await apiFetch("/api/auth/me", { retryOn401: true });
    const json = await res.json();
    if (res.ok) setMe(json.data);
  }

  async function cancelOrResume(cancelAtPeriodEnd: boolean) {
    setLoadingAction(cancelAtPeriodEnd ? "cancel" : "resume");
    const res = await apiFetch("/api/subscriptions/manage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ target: "subscription", cancelAtPeriodEnd })
    });
    const json = await res.json();
    setLoadingAction("");
    if (!res.ok) {
      showToast(json.message || "Unable to update subscription");
      return;
    }
    showToast(cancelAtPeriodEnd ? "Subscription will cancel at period end" : "Subscription resumed");
    await refreshMe();
  }

  if (loading) {
    return (
      <main className="space-y-4">
        <div className="h-10 w-52 animate-pulse rounded-xl bg-muted" />
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-semibold">Billing & Payment History</h1>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-5">
        <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
          <p className="text-xs uppercase tracking-wider text-primary/80">Current plan</p>
          <p className="mt-1 text-2xl font-semibold">{planLabel}</p>
          <p className="mt-1 text-sm text-foreground/75">
            Status: {me?.subscription?.status || "none"}
            {me?.subscription?.cancelAtPeriodEnd ? " (canceling at period end)" : ""}
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold">Manage billing</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => cancelOrResume(true)} disabled={loadingAction.length > 0 || me?.subscriptionPlan === "free"} className="inline-flex h-10 items-center rounded-2xl border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">
              {loadingAction === "cancel" ? "Cancelling..." : "Cancel at period end"}
            </button>
            <button onClick={() => cancelOrResume(false)} disabled={loadingAction.length > 0 || me?.subscriptionPlan === "free"} className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
              {loadingAction === "resume" ? "Saving..." : "Resume subscription"}
            </button>
            <Link href="/upgrade" className="inline-flex h-10 items-center rounded-2xl border border-border px-4 text-sm font-semibold hover:bg-muted">
              Buy coins
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-muted/30 p-4">
          <p className="text-sm font-semibold">Payment history</p>
          {payments.length === 0 ? (
            <p className="mt-2 text-sm text-foreground/65">No payment records yet.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm">
                  <div>
                    <p className="font-semibold">
                      {payment.type === "coin"
                        ? `Coin purchase${payment.coinsAdded ? ` • +${payment.coinsAdded} coins` : ""}`
                        : `Subscription • ${payment.subscriptionPlan || "plan"}`}
                    </p>
                    <p className="text-xs text-foreground/65">
                      {new Date(payment.paidAt || payment.createdAt || Date.now()).toLocaleString()}
                    </p>
                    <p className="text-xs text-foreground/65">
                      Invoice: {payment.invoiceId || payment.referenceId || "-"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatMoney(payment.amount, payment.currency || currency)}</p>
                    <p className={`text-xs ${payment.status === "succeeded" ? "text-emerald-600" : "text-foreground/65"}`}>{payment.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Toast open={Boolean(toast)} message={toast} />
    </main>
  );
}
