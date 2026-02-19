"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Coins, X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";

type CoinPackage = {
  id: string;
  coins: number;
  amount: number;
  label: string;
  badge: string;
  extra: number;
};

type CoinModalContextValue = {
  coins: number;
  openCoinModal: (options?: string | { reason?: string; packageId?: string; directCheckout?: boolean }) => void;
  closeCoinModal: () => void;
  refreshCoins: () => Promise<void>;
};

const CoinModalContext = createContext<CoinModalContextValue | null>(null);
const VIP_BONUS_PERCENT = 15;
const VIP_MULTIPLIER = 1 + VIP_BONUS_PERCENT / 100;

function formatUsd(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

function getTierTone(pkg: CoinPackage) {
  const key = `${pkg.id} ${pkg.label} ${pkg.badge}`.toLowerCase();
  if (key.includes("diamond")) return "from-primary/95 to-primary/75";
  if (key.includes("elite")) return "from-primary to-primary/80";
  if (key.includes("basic")) return "from-primary/90 to-primary/80";
  if (key.includes("best")) return "from-primary to-primary/80";
  return "from-primary to-primary/80";
}

export function CoinModalProvider({ children }: { children: React.ReactNode }) {
  const [coins, setCoins] = useState(0);
  const [open, setOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [vipTrial, setVipTrial] = useState(false);
  const [pendingDirectCheckout, setPendingDirectCheckout] = useState(false);
  const [directOnlyFlow, setDirectOnlyFlow] = useState(false);
  const [activeOffer, setActiveOffer] = useState<null | { code: "limited_700_499"; label: string; coins: number; amount: number }>(null);

  async function refreshCoins() {
    const res = await apiFetch("/api/auth/me", { retryOn401: true });
    const json = await res.json();
    if (res.ok) setCoins(json.data.coins ?? 0);
  }

  async function loadPackages() {
    const res = await apiFetch("/api/coins/packages");
    const json = await res.json();
    if (res.ok) {
      const nextPackages = json.data || [];
      setPackages(nextPackages);
      if (nextPackages?.length && !selectedId) setSelectedId(nextPackages[0].id);
      if (pendingDirectCheckout) {
        const offer =
          nextPackages.find((pkg: CoinPackage) => pkg.amount === 499 && pkg.coins >= 700) ||
          nextPackages.find((pkg: CoinPackage) => pkg.amount === 499) ||
          nextPackages[0];
        if (offer?.id) setSelectedId(offer.id);
        setCheckoutOpen(true);
        setPendingDirectCheckout(false);
      }
      return;
    }

    if (pendingDirectCheckout) {
      setPendingDirectCheckout(false);
      setDirectOnlyFlow(false);
    }
  }

  function openCoinModal(options?: string | { reason?: string; packageId?: string; directCheckout?: boolean }) {
    const resolved =
      typeof options === "string"
        ? { reason: options, directCheckout: false }
        : { reason: options?.reason, packageId: options?.packageId, directCheckout: Boolean(options?.directCheckout) };

    if (resolved.reason) setReason(resolved.reason);
    setDirectOnlyFlow(Boolean(resolved.directCheckout));
    setActiveOffer(
      resolved.directCheckout
        ? { code: "limited_700_499", label: "Limited Offer DOUBLE", coins: 700, amount: 499 }
        : null
    );
    if (resolved.directCheckout) setVipTrial(false);
    setOpen(true);

    if (resolved.directCheckout) {
      if (!packages.length) {
        setPendingDirectCheckout(true);
        loadPackages();
        return;
      }

      const offer =
        (resolved.packageId ? packages.find((pkg) => pkg.id === resolved.packageId) : null) ||
        packages.find((pkg) => pkg.amount === 499 && pkg.coins >= 700) ||
        packages.find((pkg) => pkg.amount === 499) ||
        packages[0];
      if (offer?.id) setSelectedId(offer.id);
      setCheckoutOpen(true);
    }
  }

  function closeCoinModal() {
    setOpen(false);
    setCheckoutOpen(false);
    setPendingDirectCheckout(false);
    setDirectOnlyFlow(false);
    setActiveOffer(null);
    setReason("");
  }

  useEffect(() => {
    refreshCoins();
    loadPackages();
  }, []);

  useEffect(() => {
    const syncFromEvent = (event: Event) => {
      const custom = event as CustomEvent<{ coins?: number }>;
      if (typeof custom.detail?.coins === "number") {
        setCoins(custom.detail.coins);
        return;
      }
      refreshCoins();
    };

    const refreshOnFocus = () => refreshCoins();
    const refreshOnVisibility = () => {
      if (!document.hidden) refreshCoins();
    };

    const interval = window.setInterval(() => {
      refreshCoins();
    }, 8000);

    window.addEventListener("velora:coin-sync", syncFromEvent as EventListener);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("velora:coin-sync", syncFromEvent as EventListener);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ reason?: string }>;
      openCoinModal(custom.detail?.reason || "Insufficient coins");
      refreshCoins();
    };

    window.addEventListener("velora:coin-required", handler as EventListener);
    return () => window.removeEventListener("velora:coin-required", handler as EventListener);
  }, []);

  const selected = useMemo(() => packages.find((pkg) => pkg.id === selectedId) || null, [packages, selectedId]);
  const selectedCoinsWithVip = selected ? Math.floor(selected.coins * VIP_MULTIPLIER) : 0;

  async function onBuyNow() {
    if (!selected) return;
    if (!termsAccepted) return;

    setLoading(true);
    const meRes = await apiFetch("/api/auth/me", { retryOn401: true });
    const meJson = await meRes.json();
    if (!meRes.ok) {
      setLoading(false);
      return;
    }

    const res = await apiFetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({
        userId: meJson.data.userId,
        mode: "coins",
        packageId: selected.id,
        vipEnabled: activeOffer ? false : vipTrial,
        offerCode: activeOffer?.code
      })
    });

    const json = await res.json();
    setLoading(false);

    if (res.ok && json.data?.checkoutUrl) {
      window.location.href = json.data.checkoutUrl;
    }
  }

  return (
    <CoinModalContext.Provider value={{ coins, openCoinModal, closeCoinModal, refreshCoins }}>
      {children}
      {open ? (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/45 p-4">
          {pendingDirectCheckout ? (
            <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-2xl">
              <p className="text-lg font-semibold">Preparing your offer checkout...</p>
              <p className="mt-2 text-sm text-foreground/65">Please wait a moment.</p>
            </div>
          ) : null}

          {!checkoutOpen && !pendingDirectCheckout && !directOnlyFlow ? (
            <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-4 shadow-2xl md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="w-full">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                 
                  <div>
                    <p className="text-2xl font-semibold leading-none md:text-3xl">Choose a package</p>
                    <p className="mt-1 text-sm text-foreground/60">{reason || "Buy coins to continue and unlock premium actions."}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center">
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
              <button onClick={closeCoinModal} className="rounded-xl border border-border p-2">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 grid gap-2.5 md:grid-cols-2">
              {packages.map((pkg, index) => {
                const selectedPlan = selectedId === pkg.id;
                const featured = index === 0;
                return (
                  <button
                    key={pkg.id}
                    onClick={() => setSelectedId(pkg.id)}
                    className={`relative rounded-2xl border p-3 text-left transition ${
                      selectedPlan
                        ? "border-primary bg-primary/5 shadow-[0_0_0_2px_rgba(83,58,253,0.14)]"
                        : "border-border bg-card hover:border-primary/50"
                    } ${featured ? "md:col-span-2" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex rounded-full bg-gradient-to-r px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ${getTierTone(pkg)}`}>
                          {pkg.badge || pkg.label}
                        </span>
                        <p className="mt-2 text-2xl font-black leading-none md:text-3xl">
                          {(vipTrial ? Math.floor(pkg.coins * VIP_MULTIPLIER) : pkg.coins).toLocaleString()}{" "}
                          <span className="text-lg text-primary">coins</span>
                        </p>
                        <p className="mt-1 text-xs text-foreground/65">
                          {vipTrial
                            ? `VIP ON: +${VIP_BONUS_PERCENT}% monthly coins`
                            : pkg.extra > 0
                              ? `${pkg.extra}% bonus included`
                              : "Standard package"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-semibold md:text-3xl">{formatUsd(pkg.amount)}</p>
                        <p className="mt-1 text-[11px] text-foreground/60">{featured ? "Best entry plan" : "One-time payment"}</p>
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
              onClick={() => setCheckoutOpen(true)}
              disabled={!selected}
              className="mx-auto mt-4 block h-12 w-full rounded-2xl bg-primary px-4 text-base font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              Continue to checkout
            </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {checkoutOpen && selected ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-card p-5 shadow-2xl md:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="w-full">
                <p className="text-3xl font-semibold md:text-4xl">Complete your purchase</p>
                <p className="mt-2 text-base text-foreground/70">
                  You are purchasing <span className="font-semibold text-foreground">{activeOffer?.label || selected.label || "Coin plan"}</span>
                  {activeOffer ? "." : vipTrial ? " with VIP recurring billing." : "."}
                </p>
                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-3xl font-bold">
                  {(activeOffer ? activeOffer.coins : vipTrial ? selectedCoinsWithVip : selected.coins).toLocaleString()}{" "}
                  <Coins className="h-7 w-7 text-primary" />
                </div>
              </div>
              <button onClick={closeCoinModal} className="rounded-xl border border-border p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-muted/40 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/70">Plan</span>
                <span className="font-semibold">{activeOffer?.label || selected.label || "Coin package"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-foreground/70">Coins</span>
                <span className="font-semibold">{(activeOffer ? activeOffer.coins : vipTrial ? selectedCoinsWithVip : selected.coins).toLocaleString()}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-foreground/70">Amount</span>
                <span className="text-xl font-bold">{formatUsd(activeOffer?.amount ?? selected.amount)}{activeOffer ? "" : vipTrial ? "/month" : ""}</span>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <label className="flex items-center gap-3">
                <input type="checkbox" className="h-5 w-5 accent-primary" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} />
                <span>I agree to <span className="text-primary">Terms and Conditions</span> and <span className="text-primary">Privacy Policy</span>.</span>
              </label>
              {!activeOffer ? (
                <label className="flex items-center gap-3">
                  <input type="checkbox" className="h-5 w-5 accent-primary" checked={vipTrial} onChange={(event) => setVipTrial(event.target.checked)} />
                  <span>Enable VIP recurring billing for this package and receive {VIP_BONUS_PERCENT}% bonus coins every month until cancelled.</span>
                </label>
              ) : null}
            </div>

            <button
              onClick={onBuyNow}
              disabled={loading || !termsAccepted}
              className="mt-6 block h-12 w-full rounded-2xl bg-primary px-6 text-base font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? "Redirecting to Stripe..." : "Continue to Stripe Checkout"}
            </button>

            <p className="mt-4 text-center text-xs text-foreground/60">Secure checkout powered by Stripe. Available methods (card, Apple Pay, Google Pay) will be shown by Stripe based on your device/browser.</p>
          </div>
        </div>
      ) : null}
    </CoinModalContext.Provider>
  );
}

export function useCoinModal() {
  const context = useContext(CoinModalContext);
  if (!context) throw new Error("useCoinModal must be used within CoinModalProvider");
  return context;
}
