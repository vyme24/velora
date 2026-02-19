"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Gem, ShieldCheck } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { Toast } from "@/components/ui/toast";

type CoinPackage = {
  id: string;
  coins: number;
  amount: number;
  label: string;
  badge: string;
  extra: number;
};

type SubscriptionPlan = {
  id: string;
  key: "gold" | "platinum";
  label: string;
  badge?: string;
  amount: number;
  currency: string;
};

type Me = {
  userId: string;
  coins: number;
  subscriptionPlan?: "free" | "gold" | "platinum";
};

function formatUsd(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

export default function UpgradePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState<"" | "gold" | "platinum">("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/api/auth/me", { retryOn401: true });
      const meJson = await meRes.json();
      if (meRes.ok) setMe(meJson.data);

      const pkgRes = await apiFetch("/api/coins/packages");
      const pkgJson = await pkgRes.json();
      if (pkgRes.ok) {
        setPackages(pkgJson.data || []);
        if (pkgJson.data?.length) setSelectedId(pkgJson.data[0].id);
      }

      const subRes = await apiFetch("/api/subscriptions/plans");
      const subJson = await subRes.json();
      if (subRes.ok) {
        setSubscriptionPlans(subJson.data || []);
      }
    })();
  }, []);

  const selected = useMemo(() => packages.find((pkg) => pkg.id === selectedId) || null, [packages, selectedId]);

  async function onBuyNow() {
    if (!me?.userId || !selected) return;
    setLoading(true);

    const res = await apiFetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({
        userId: me.userId,
        mode: "coins",
        packageId: selected.id
      })
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setToast(json.message || "Unable to start checkout");
      setTimeout(() => setToast(""), 1800);
      return;
    }

    if (json.data?.checkoutUrl) {
      window.location.href = json.data.checkoutUrl;
      return;
    }

    setToast("Checkout started");
    setTimeout(() => setToast(""), 1400);
  }

  async function onBuySubscription(plan: "gold" | "platinum") {
    if (!me?.userId) return;
    setSubLoading(plan);

    const res = await apiFetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({
        mode: "subscription",
        plan
      })
    });

    const json = await res.json();
    setSubLoading("");

    if (!res.ok) {
      setToast(json.message || "Unable to start subscription checkout");
      setTimeout(() => setToast(""), 1800);
      return;
    }

    if (json.data?.checkoutUrl) {
      window.location.href = json.data.checkoutUrl;
    }
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <p className="text-2xl font-semibold">Choose a package</p>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-1.5 text-lg font-semibold">
            <Coins className="h-4 w-4 text-primary" /> {me?.coins ?? 0}
          </span>
          <span className="rounded-xl border border-primary/35 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            Current plan: {(me?.subscriptionPlan || "free").toUpperCase()}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground/70">
        Send each message costs <span className="font-semibold text-primary">50 coins</span>. Unlock all photos on a profile costs <span className="font-semibold text-primary">70 coins</span>.
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {subscriptionPlans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => onBuySubscription(plan.key)}
            disabled={Boolean(subLoading) || me?.subscriptionPlan === plan.key}
            className="rounded-3xl border border-border bg-card p-4 text-left transition hover:border-primary/35"
          >
            <p className="text-sm font-semibold text-primary">{plan.label}</p>
            <p className="mt-1 text-3xl font-semibold">{formatUsd(plan.amount)}/mo</p>
            <p className="mt-1 text-xs text-foreground/70">{plan.key === "gold" ? "Unlimited messaging, see who liked you, no ads." : "Weekly boost, read receipts, priority support."}</p>
            <p className="mt-3 text-xs font-semibold">
              {me?.subscriptionPlan === plan.key
                ? "Currently active"
                : subLoading === plan.key
                  ? "Starting checkout..."
                  : `Subscribe to ${plan.label}`}
            </p>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {packages.map((pkg) => (
          <button
            key={pkg.id}
            onClick={() => setSelectedId(pkg.id)}
            className={`w-full rounded-3xl border p-4 text-left transition ${selectedId === pkg.id ? "border-primary shadow-[0_0_25px_rgba(83,58,253,0.25)]" : "border-border bg-card"}`}
          >
            <div className="mb-3 inline-flex rounded-xl bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {pkg.badge || pkg.label}
            </div>
            <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <p className="text-lg font-semibold">{pkg.label}</p>
                <p className="mt-1 text-5xl font-semibold">{pkg.coins.toLocaleString()}<span className="ml-1 text-base font-medium text-primary">coins</span></p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-semibold">{formatUsd(pkg.amount)}</p>
                {pkg.extra > 0 ? (
                  <p className="mt-1 inline-flex rounded-full border border-primary/40 px-2 py-1 text-xs font-semibold text-primary">
                    {pkg.extra}% Extra
                  </p>
                ) : null}
              </div>
            </div>
          </button>
        ))}
      </div>

      <button
        onClick={onBuyNow}
        disabled={!selected || loading}
        className="h-14 w-full rounded-2xl bg-primary text-xl font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Starting checkout..." : `Buy now ${selected ? `(${formatUsd(selected.amount)})` : ""}`}
      </button>

      <div className="flex items-center justify-center gap-4 text-sm text-foreground/70">
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Secure payments</span>
        <span className="inline-flex items-center gap-1"><Gem className="h-4 w-4" /> Instant coin delivery</span>
      </div>

      <Toast open={Boolean(toast)} message={toast} />
    </main>
  );
}
