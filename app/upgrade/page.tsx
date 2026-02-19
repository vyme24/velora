"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, Gem, ShieldCheck } from "lucide-react";
import { apiFetch, triggerCoinSync } from "@/lib/client-api";
import { Toast } from "@/components/ui/toast";
import { useI18n } from "@/components/i18n-provider";

type CoinPackage = {
  id: string;
  coins: number;
  amount: number;
  currency: string;
  label: string;
  badge: string;
  extra: number;
};

type Me = {
  userId: string;
  coins: number;
};

type RuntimeConfig = {
  coinRules?: {
    messageCost?: number;
    profileUnlockCost?: number;
  };
};

function getTierTone(pkg: CoinPackage) {
  const key = `${pkg.id} ${pkg.label} ${pkg.badge}`.toLowerCase();
  if (key.includes("diamond")) return "from-primary/95 to-primary/75";
  if (key.includes("elite")) return "from-primary to-primary/80";
  if (key.includes("basic")) return "from-primary/90 to-primary/80";
  if (key.includes("best")) return "from-primary to-primary/80";
  return "from-primary to-primary/80";
}

const VIP_BONUS_PERCENT = 15;
const VIP_MULTIPLIER = 1 + VIP_BONUS_PERCENT / 100;

export default function UpgradePage() {
  const { formatMoney, currency, t } = useI18n();
  const [me, setMe] = useState<Me | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [vipTrial, setVipTrial] = useState(false);
  const [toast, setToast] = useState("");
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);

  useEffect(() => {
    (async () => {
      const [meRes, pkgRes, configRes] = await Promise.all([
        apiFetch("/api/auth/me", { retryOn401: true }),
        apiFetch("/api/coins/packages"),
        apiFetch("/api/auth/system-config", { retryOn401: true })
      ]);
      const meJson = await meRes.json();
      const pkgJson = await pkgRes.json();
      const configJson = await configRes.json();
      if (meRes.ok) setMe(meJson.data);
      if (pkgRes.ok) {
        setPackages(pkgJson.data || []);
        if (pkgJson.data?.length) setSelectedId(pkgJson.data[0].id);
      }
      if (configRes.ok) setRuntimeConfig(configJson.data || null);
    })();
  }, []);

  const selected = useMemo(() => packages.find((pkg) => pkg.id === selectedId) || null, [packages, selectedId]);
  const selectedCoinsWithVip = selected ? Math.floor(selected.coins * VIP_MULTIPLIER) : 0;

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
        packageId: selected.id,
        vipEnabled: vipTrial
      })
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setToast(json.message || "Unable to start checkout");
      setTimeout(() => setToast(""), 1800);
      return;
    }

    if (json.data?.internalProcessed) {
      const nextCoins = Number(json.data?.coins ?? me?.coins ?? 0);
      if (Number.isFinite(nextCoins)) {
        setMe((prev) => (prev ? { ...prev, coins: nextCoins } : prev));
        triggerCoinSync(nextCoins);
      }
      setToast(vipTrial ? "VIP recurring activated and coins added." : "Purchase completed.");
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

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-8">
      <div className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-3xl font-semibold">{t("upgrade.choose_package", "Choose a package")}</p>
          <span className="inline-flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-1.5 text-lg font-semibold">
            <Coins className="h-4 w-4 text-primary" /> {me?.coins ?? 0}
          </span>
        </div>
        <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center">
          <button
            type="button"
            onClick={() => setVipTrial((v) => !v)}
            className={`inline-flex h-10 w-[150px] items-center rounded-full border px-1 transition ${vipTrial ? "border-primary bg-primary/10" : "border-border bg-muted"}`}
          >
            <span className={`h-8 w-8 rounded-full transition ${vipTrial ? "translate-x-[108px] bg-primary" : "bg-background shadow-sm"}`} />
            <span className="mx-auto inline-flex items-center gap-1 text-sm font-semibold text-foreground/70">VIP</span>
          </button>
          <p className="text-sm text-foreground/60">
            Enable VIP plan and get <span className="font-semibold text-foreground/70">{VIP_BONUS_PERCENT}% extra coins</span> on every monthly billing cycle until you unsubscribe.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 text-sm text-foreground/70">
        Send each message costs <span className="font-semibold text-primary">{runtimeConfig?.coinRules?.messageCost ?? 50} coins</span>. Unlock all photos on a profile costs <span className="font-semibold text-primary">{runtimeConfig?.coinRules?.profileUnlockCost ?? 70} coins</span>.
      </div>

      <div className="space-y-3">
        {packages.map((pkg, index) => {
          const selectedPlan = selectedId === pkg.id;
          const featured = index === 0;
          return (
          <button
            key={pkg.id}
            onClick={() => setSelectedId(pkg.id)}
            className={`relative w-full rounded-2xl border p-4 text-left transition ${
              selectedPlan
                ? "border-primary bg-primary/5 shadow-[0_0_0_2px_rgba(83,58,253,0.14)]"
                : "border-border bg-card hover:border-primary/50"
            } ${featured ? "" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className={`inline-flex rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ${getTierTone(pkg)}`}>
                  {pkg.badge || pkg.label}
                </span>
                <p className="mt-2 text-3xl font-black leading-none">
                  {(vipTrial ? Math.floor(pkg.coins * VIP_MULTIPLIER) : pkg.coins).toLocaleString()}{" "}
                  <span className="text-base text-primary">coins</span>
                </p>
                <p className="mt-1 text-xs text-foreground/65">
                  {vipTrial ? `VIP ON: +${VIP_BONUS_PERCENT}% monthly coins` : pkg.extra > 0 ? `${pkg.extra}% bonus included` : "Standard package"}
                </p>
              </div>
              <div className="text-right">
                        <p className="text-3xl font-semibold">{formatMoney(pkg.amount, pkg.currency || currency)}</p>
                <p className="mt-1 text-[11px] text-foreground/60">One-time payment</p>
              </div>
            </div>
            {selectedPlan ? (
              <span className="mt-3 inline-flex rounded-full border border-primary/35 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                Selected plan
              </span>
            ) : null}
          </button>
        );
      })}
      </div>

      <button
        onClick={onBuyNow}
        disabled={!selected || loading}
        className="h-14 w-full rounded-2xl bg-primary text-xl font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
      >
        {loading ? "Starting checkout..." : `Buy now ${selected ? `(${formatMoney(selected.amount, selected.currency || currency)})` : ""} • ${(vipTrial ? selectedCoinsWithVip : selected?.coins || 0).toLocaleString()} coins`}
      </button>

      <div className="flex items-center justify-center gap-4 text-sm text-foreground/70">
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-4 w-4" /> Secure payments</span>
        <span className="inline-flex items-center gap-1"><Gem className="h-4 w-4" /> Instant coin delivery</span>
      </div>

      <Toast open={Boolean(toast)} message={toast} />
    </main>
  );
}
