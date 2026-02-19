"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Coins, X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { useI18n } from "@/components/i18n-provider";
import { getAuthMeCached, getCoinPackagesCached, getLimitedOfferCached, invalidateRuntimeCache } from "@/lib/client-runtime-cache";

type CoinPackage = {
  id: string;
  coins: number;
  amount: number;
  currency: string;
  label: string;
  badge: string;
  extra: number;
};

type LimitedOffer = {
  enabled: boolean;
  code: string;
  badge: string;
  headline: string;
  coins: number;
  amountCents: number;
  currency?: string;
  cta: string;
  reason: string;
  label: string;
  subtext: string;
};

type CoinModalContextValue = {
  coins: number;
  limitedOffer: LimitedOffer | null;
  openCoinModal: (options?: string | { reason?: string; packageId?: string; directCheckout?: boolean }) => void;
  closeCoinModal: () => void;
  refreshCoins: () => Promise<void>;
};

const CoinModalContext = createContext<CoinModalContextValue | null>(null);
const VIP_BONUS_PERCENT = 15;
const VIP_MULTIPLIER = 1 + VIP_BONUS_PERCENT / 100;

function getTierTone(pkg: CoinPackage) {
  const key = `${pkg.id} ${pkg.label} ${pkg.badge}`.toLowerCase();
  if (key.includes("diamond")) return "from-primary/95 to-primary/75";
  if (key.includes("elite")) return "from-primary to-primary/80";
  if (key.includes("basic")) return "from-primary/90 to-primary/80";
  if (key.includes("best")) return "from-primary to-primary/80";
  return "from-primary to-primary/80";
}

export function CoinModalProvider({ children }: { children: React.ReactNode }) {
  const { formatMoney, currency: defaultCurrency } = useI18n();
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
  const [limitedOffer, setLimitedOffer] = useState<LimitedOffer | null>(null);
  const [activeOffer, setActiveOffer] = useState<null | { code: string; label: string; coins: number; amount: number; currency?: string }>(null);

  const refreshCoins = useCallback(async (force = false) => {
    const me = await getAuthMeCached({ force, ttlMs: 10_000 });
    if (me) setCoins(me.coins ?? 0);
  }, []);

  const loadPackages = useCallback(async (force = false) => {
    const nextPackages = (await getCoinPackagesCached({ force, ttlMs: 60_000 })) || [];
    setPackages(nextPackages);
    setSelectedId((current) => current || nextPackages[0]?.id || "");
  }, []);

  const loadLimitedOffer = useCallback(async (force = false) => {
    const offer = await getLimitedOfferCached({ force, ttlMs: 60_000 });
    setLimitedOffer(offer || null);
  }, []);

  const openCoinModal = useCallback((options?: string | { reason?: string; packageId?: string; directCheckout?: boolean }) => {
    const resolved =
      typeof options === "string"
        ? { reason: options, directCheckout: false }
        : { reason: options?.reason, packageId: options?.packageId, directCheckout: Boolean(options?.directCheckout) };

    if (resolved.reason) setReason(resolved.reason);
    setDirectOnlyFlow(Boolean(resolved.directCheckout));
    setActiveOffer(
      resolved.directCheckout && limitedOffer?.enabled
        ? {
            code: limitedOffer.code,
            label: limitedOffer.label,
            coins: limitedOffer.coins,
            amount: limitedOffer.amountCents,
            currency: limitedOffer.currency || defaultCurrency
          }
        : null
    );
    if (!resolved.reason && resolved.directCheckout && limitedOffer?.reason) {
      setReason(limitedOffer.reason);
    }
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
        (limitedOffer?.enabled ? packages.find((pkg) => pkg.amount === limitedOffer.amountCents) : null) ||
        packages[0];
      if (offer?.id) setSelectedId(offer.id);
      setCheckoutOpen(true);
    }
  }, [defaultCurrency, limitedOffer, loadPackages, packages]);

  function closeCoinModal() {
    setOpen(false);
    setCheckoutOpen(false);
    setPendingDirectCheckout(false);
    setDirectOnlyFlow(false);
    setActiveOffer(null);
    setReason("");
  }

  useEffect(() => {
    void refreshCoins();
    void loadPackages();
    void loadLimitedOffer();
  }, [refreshCoins, loadPackages, loadLimitedOffer]);

  useEffect(() => {
    if (!pendingDirectCheckout) return;
    if (!packages.length) return;
    const offer =
      (limitedOffer?.enabled ? packages.find((pkg) => pkg.amount === limitedOffer.amountCents) : null) ||
      packages[0];
    if (offer?.id) setSelectedId(offer.id);
    setCheckoutOpen(true);
    setPendingDirectCheckout(false);
  }, [limitedOffer, packages, pendingDirectCheckout]);

  useEffect(() => {
    const syncFromEvent = (event: Event) => {
      const custom = event as CustomEvent<{ coins?: number }>;
      if (typeof custom.detail?.coins === "number") {
        setCoins(custom.detail.coins);
        return;
      }
      void refreshCoins();
    };

    const refreshOnFocus = () => {
      void refreshCoins();
    };
    const refreshOnVisibility = () => {
      if (!document.hidden) void refreshCoins();
    };

    window.addEventListener("velora:coin-sync", syncFromEvent as EventListener);
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      window.removeEventListener("velora:coin-sync", syncFromEvent as EventListener);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [refreshCoins]);

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ reason?: string }>;
      openCoinModal(custom.detail?.reason || "Insufficient coins");
      void refreshCoins(true);
    };

    window.addEventListener("velora:coin-required", handler as EventListener);
    return () => window.removeEventListener("velora:coin-required", handler as EventListener);
  }, [openCoinModal, refreshCoins]);

  const selected = useMemo(() => packages.find((pkg) => pkg.id === selectedId) || null, [packages, selectedId]);
  const selectedCoinsWithVip = selected ? Math.floor(selected.coins * VIP_MULTIPLIER) : 0;

  async function onBuyNow() {
    if (!selected) return;
    if (!termsAccepted) return;

    setLoading(true);
    const me = (await getAuthMeCached({ ttlMs: 5_000 })) || (await getAuthMeCached({ force: true, ttlMs: 5_000 }));
    if (!me?.userId) {
      setLoading(false);
      return;
    }

    const res = await apiFetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({
        userId: me.userId,
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
      return;
    }

    if (res.ok && json.data?.internalProcessed) {
      const nextCoins = Number(json.data?.coins ?? coins);
      if (Number.isFinite(nextCoins)) {
        setCoins(nextCoins);
        invalidateRuntimeCache("authMe");
        window.dispatchEvent(new CustomEvent("velora:coin-sync", { detail: { coins: nextCoins } }));
      } else {
        void refreshCoins(true);
      }
      closeCoinModal();
    }
  }

  return (
    <CoinModalContext.Provider value={{ coins, limitedOffer, openCoinModal, closeCoinModal, refreshCoins }}>
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
                        <p className="text-2xl font-semibold md:text-3xl">{formatMoney(pkg.amount, pkg.currency || defaultCurrency)}</p>
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
                <span className="text-xl font-bold">{formatMoney(activeOffer?.amount ?? selected.amount, activeOffer?.currency || selected.currency || defaultCurrency)}{activeOffer ? "" : vipTrial ? "/month" : ""}</span>
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
              {loading ? "Processing..." : "Complete purchase"}
            </button>

            <p className="mt-4 text-center text-xs text-foreground/60">Secure checkout. VIP subscriptions are now handled directly inside your Velora account with recurring renewal management.</p>
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
