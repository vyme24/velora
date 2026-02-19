"use client";

import { useEffect, useMemo, useState } from "react";
import { Crown, Gem, Loader2, Save, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiFetch } from "@/lib/client-api";
import { Toast } from "@/components/ui/toast";

const tabs = ["Account", "Notifications", "Privacy", "Subscription", "Delete account"] as const;

type Me = {
  userId: string;
  role?: string;
  subscriptionPlan: "free" | "gold" | "platinum";
  subscription?: {
    status?: string;
    cancelAtPeriodEnd?: boolean;
    currentPeriodEnd?: string | null;
  };
};

type ProfileSettings = {
  name: string;
  email: string;
  username: string;
  location: { city: string; state: string; country: string };
  notifications: {
    emailMessages: boolean;
    emailMatches: boolean;
    emailPromotions: boolean;
    pushMessages: boolean;
    pushMatches: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    showDistance: boolean;
    incognito: boolean;
  };
};

type SubscriptionPlan = {
  id: string;
  key: "gold" | "platinum";
  label: string;
  badge?: string;
  amount: number;
  currency: string;
};

const emptySettings: ProfileSettings = {
  name: "",
  email: "",
  username: "",
  location: { city: "", state: "", country: "" },
  notifications: {
    emailMessages: true,
    emailMatches: true,
    emailPromotions: false,
    pushMessages: true,
    pushMatches: true
  },
  privacy: {
    showOnlineStatus: true,
    showDistance: true,
    incognito: false
  }
};

export default function SettingsPage() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Account");
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<ProfileSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [toast, setToast] = useState("");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const [meRes, profileRes, planRes] = await Promise.all([
        apiFetch("/api/auth/me", { retryOn401: true }),
        apiFetch("/api/profile/me", { retryOn401: true }),
        apiFetch("/api/subscriptions/plans")
      ]);

      const meJson = await meRes.json();
      const profileJson = await profileRes.json();
      const planJson = await planRes.json();

      if (meRes.ok) setMe(meJson.data);
      if (profileRes.ok) {
        setSettings({
          name: profileJson.data.name || "",
          email: profileJson.data.email || "",
          username: profileJson.data.username || "",
          location: {
            city: profileJson.data.location?.city || "",
            state: profileJson.data.location?.state || "",
            country: profileJson.data.location?.country || ""
          },
          notifications: {
            emailMessages: profileJson.data.notifications?.emailMessages ?? true,
            emailMatches: profileJson.data.notifications?.emailMatches ?? true,
            emailPromotions: profileJson.data.notifications?.emailPromotions ?? false,
            pushMessages: profileJson.data.notifications?.pushMessages ?? true,
            pushMatches: profileJson.data.notifications?.pushMatches ?? true
          },
          privacy: {
            showOnlineStatus: profileJson.data.privacy?.showOnlineStatus ?? true,
            showDistance: profileJson.data.privacy?.showDistance ?? true,
            incognito: profileJson.data.privacy?.incognito ?? false
          }
        });
      }
      if (planRes.ok) setPlans(planJson.data || []);

      setLoading(false);
    })();
  }, []);

  const subLabel = useMemo(() => {
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

  async function savePatch(payload: Record<string, unknown>, successText: string) {
    setLoadingAction("save");
    const res = await apiFetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    setLoadingAction("");
    if (!res.ok) {
      showToast(json.message || "Unable to save settings");
      return;
    }
    showToast(successText);
  }

  async function startSubscription(plan: "gold" | "platinum") {
    if (!me?.userId) return;
    setLoadingAction(`buy-${plan}`);
    const res = await apiFetch("/api/stripe/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ mode: "subscription", plan })
    });
    const json = await res.json();
    setLoadingAction("");
    if (!res.ok) {
      showToast(json.message || "Unable to start subscription checkout");
      return;
    }
    if (json.data?.checkoutUrl) window.location.href = json.data.checkoutUrl;
  }

  async function openPortal() {
    setLoadingAction("portal");
    const res = await apiFetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({})
    });
    const json = await res.json();
    setLoadingAction("");
    if (!res.ok) {
      showToast(json.message || "Unable to open billing portal");
      return;
    }
    if (json.data?.portalUrl) window.location.href = json.data.portalUrl;
  }

  async function cancelOrResume(cancelAtPeriodEnd: boolean) {
    setLoadingAction(cancelAtPeriodEnd ? "cancel" : "resume");
    const res = await apiFetch("/api/stripe/subscription/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ cancelAtPeriodEnd })
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
        <div className="h-12 w-52 animate-pulse rounded-xl bg-muted" />
        <div className="h-12 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="h-64 animate-pulse rounded-3xl bg-muted" />
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-semibold">Settings</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-2xl px-4 py-2 text-sm ${tab === item ? "bg-primary text-white" : "border border-border bg-card"}`}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-card p-5">
        {tab === "Account" ? (
          <div className="space-y-4">
            <p className="text-lg font-semibold">Account details</p>
            <div className="grid gap-3 md:grid-cols-2">
              <input className="h-11 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Name" value={settings.name} onChange={(event) => setSettings((prev) => ({ ...prev, name: event.target.value }))} />
              <input className="h-11 rounded-xl border border-border bg-muted px-3 text-sm text-foreground/65" value={settings.email} readOnly />
              <input className="h-11 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Username" value={settings.username} onChange={(event) => setSettings((prev) => ({ ...prev, username: event.target.value }))} />
              <div className="flex h-11 items-center justify-between rounded-xl border border-border bg-background px-3 text-sm">
                <span>Dark mode</span>
                <ThemeToggle />
              </div>
              <input className="h-11 rounded-xl border border-border bg-background px-3 text-sm" placeholder="City" value={settings.location.city} onChange={(event) => setSettings((prev) => ({ ...prev, location: { ...prev.location, city: event.target.value } }))} />
              <input className="h-11 rounded-xl border border-border bg-background px-3 text-sm" placeholder="State" value={settings.location.state} onChange={(event) => setSettings((prev) => ({ ...prev, location: { ...prev.location, state: event.target.value } }))} />
              <input className="h-11 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Country" value={settings.location.country} onChange={(event) => setSettings((prev) => ({ ...prev, location: { ...prev.location, country: event.target.value } }))} />
            </div>
            <button
              onClick={() =>
                savePatch(
                  { name: settings.name, username: settings.username, location: settings.location },
                  "Account settings saved"
                )
              }
              disabled={loadingAction === "save"}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {loadingAction === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save account
            </button>
          </div>
        ) : null}

        {tab === "Notifications" ? (
          <div className="space-y-4">
            <p className="text-lg font-semibold">Notification preferences</p>
            <div className="grid gap-2">
              {[
                ["emailMessages", "Email for new messages"],
                ["emailMatches", "Email for new matches"],
                ["emailPromotions", "Email promotions and offers"],
                ["pushMessages", "Push for new messages"],
                ["pushMatches", "Push for new matches"]
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.notifications[key as keyof ProfileSettings["notifications"]])}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          [key]: event.target.checked
                        }
                      }))
                    }
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => savePatch({ notifications: settings.notifications }, "Notification settings saved")}
              disabled={loadingAction === "save"}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {loadingAction === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save notifications
            </button>
          </div>
        ) : null}

        {tab === "Privacy" ? (
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Privacy controls</p>
            <div className="grid gap-2">
              {[
                ["showOnlineStatus", "Show online status to others"],
                ["showDistance", "Show distance in profile"],
                ["incognito", "Incognito mode (reduced visibility)"]
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(settings.privacy[key as keyof ProfileSettings["privacy"]])}
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        privacy: {
                          ...prev.privacy,
                          [key]: event.target.checked
                        }
                      }))
                    }
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              ))}
            </div>
            <button
              onClick={() => savePatch({ privacy: settings.privacy }, "Privacy settings saved")}
              disabled={loadingAction === "save"}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60"
            >
              {loadingAction === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save privacy
            </button>
          </div>
        ) : null}

        {tab === "Subscription" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
              <p className="text-xs uppercase tracking-wider text-primary/80">Current plan</p>
              <p className="mt-1 text-2xl font-semibold">{subLabel}</p>
              <p className="mt-1 text-sm text-foreground/75">
                Status: {me?.subscription?.status || "none"}
                {me?.subscription?.cancelAtPeriodEnd ? " (canceling at period end)" : ""}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => startSubscription(plan.key)}
                  disabled={loadingAction.length > 0 || me?.subscriptionPlan === plan.key}
                  className="rounded-2xl border border-border bg-muted p-4 text-left transition hover:border-primary/40"
                >
                  <div className="inline-flex items-center gap-2 text-sm font-semibold">
                    {plan.key === "gold" ? <Crown className="h-4 w-4 text-primary" /> : <Gem className="h-4 w-4 text-primary" />}
                    {plan.label}
                  </div>
                  <p className="mt-2 text-2xl font-semibold">${(plan.amount / 100).toFixed(2)}/mo</p>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={openPortal} disabled={loadingAction.length > 0} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold hover:bg-muted">
                {loadingAction === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Manage billing
              </button>
              <button onClick={() => cancelOrResume(true)} disabled={loadingAction.length > 0 || me?.subscriptionPlan === "free"} className="inline-flex h-10 items-center rounded-2xl border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                {loadingAction === "cancel" ? "Cancelling..." : "Cancel at period end"}
              </button>
              <button onClick={() => cancelOrResume(false)} disabled={loadingAction.length > 0 || me?.subscriptionPlan === "free"} className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
                {loadingAction === "resume" ? "Saving..." : "Resume subscription"}
              </button>
            </div>
          </div>
        ) : null}

        {tab === "Delete account" ? (
          <div className="space-y-3">
            <p className="text-lg font-semibold text-red-500">Delete account</p>
            <p className="text-sm text-foreground/70">This action is sensitive. Contact support/admin to permanently delete your account and data.</p>
            <button
              onClick={() => showToast("Support request recorded. Contact admin for deletion workflow.")}
              className="inline-flex h-11 items-center rounded-xl border border-red-300 px-4 text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Request account deletion
            </button>
          </div>
        ) : null}
      </section>

      <Toast open={Boolean(toast)} message={toast} />
    </main>
  );
}
