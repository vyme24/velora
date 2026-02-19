"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { apiFetch } from "@/lib/client-api";
import { Toast } from "@/components/ui/toast";
import { useI18n } from "@/components/i18n-provider";

const tabs = ["Account", "Notifications", "Privacy", "Security", "Subscription", "Delete account"] as const;

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

type RuntimeConfig = {
  system?: {
    passkeyEnabled?: boolean;
  };
  notifications?: {
    inAppEnabled?: boolean;
    pushEnabled?: boolean;
    emailEnabled?: boolean;
    newMessageEnabled?: boolean;
    newMatchEnabled?: boolean;
    marketingEnabled?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
  coinRules?: {
    messageCost?: number;
    profileUnlockCost?: number;
  };
};

type PasskeyItem = {
  _id: string;
  credentialId: string;
  label?: string;
  transports?: string[];
  lastUsedAt?: string | null;
  createdAt?: string;
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
  const { t } = useI18n();
  const [tab, setTab] = useState<(typeof tabs)[number]>("Account");
  const [me, setMe] = useState<Me | null>(null);
  const [settings, setSettings] = useState<ProfileSettings>(emptySettings);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig | null>(null);
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [passkeyFeatureEnabled, setPasskeyFeatureEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);

      const [meRes, profileRes, configRes] = await Promise.all([
        apiFetch("/api/auth/me", { retryOn401: true }),
        apiFetch("/api/profile/me", { retryOn401: true }),
        apiFetch("/api/auth/system-config", { retryOn401: true })
      ]);

      const meJson = await meRes.json();
      const profileJson = await profileRes.json();
      const configJson = await configRes.json();

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
      if (configRes.ok) setRuntimeConfig(configJson.data || null);
      await refreshPasskeys();
      setLoading(false);
    })();
  }, []);

  async function refreshPasskeys() {
    const res = await apiFetch("/api/auth/passkeys", { retryOn401: true });
    const json = await res.json();
    if (!res.ok) return;
    setPasskeyFeatureEnabled(Boolean(json.data?.enabled));
    setPasskeys(json.data?.passkeys || []);
  }

  const subLabel = useMemo(() => {
    if (!me) return "Loading...";
    if (me.subscriptionPlan === "platinum") return "Platinum";
    if (me.subscriptionPlan === "gold") return "Gold";
    return "Free";
  }, [me]);

  const notificationGuards = useMemo(() => {
    const n = runtimeConfig?.notifications;
    return {
      emailMessages: Boolean((n?.emailEnabled ?? true) && (n?.newMessageEnabled ?? true)),
      emailMatches: Boolean((n?.emailEnabled ?? true) && (n?.newMatchEnabled ?? true)),
      emailPromotions: Boolean((n?.emailEnabled ?? true) && (n?.marketingEnabled ?? false)),
      pushMessages: Boolean((n?.pushEnabled ?? true) && (n?.newMessageEnabled ?? true)),
      pushMatches: Boolean((n?.pushEnabled ?? true) && (n?.newMatchEnabled ?? true))
    };
  }, [runtimeConfig]);

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

  function toBase64Url(data: ArrayBuffer) {
    const bytes = new Uint8Array(data);
    let binary = "";
    bytes.forEach((b) => {
      binary += String.fromCharCode(b);
    });
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  async function addPasskey() {
    if (!passkeyFeatureEnabled) {
      showToast("Passkey feature is disabled by admin.");
      return;
    }
    if (typeof window === "undefined" || !window.PublicKeyCredential || !navigator.credentials?.create) {
      showToast("Passkeys are not supported on this device/browser.");
      return;
    }

    try {
      setLoadingAction("passkey-add");
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBytes = crypto.getRandomValues(new Uint8Array(16));
      const publicKey: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: "Velora" },
        user: {
          id: userIdBytes,
          name: settings.email || "user@velora.app",
          displayName: settings.name || settings.email || "Velora user"
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 }
        ],
        timeout: 60000,
        attestation: "none",
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred"
        }
      };

      const credential = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null;
      if (!credential) {
        setLoadingAction("");
        showToast("Passkey creation was cancelled.");
        return;
      }

      const response = credential.response as AuthenticatorAttestationResponse;
      const transports =
        typeof response.getTransports === "function" ? response.getTransports().filter(Boolean) : [];
      const payload = {
        credentialId: toBase64Url(credential.rawId),
        publicKey: JSON.stringify({
          clientDataJSON: toBase64Url(response.clientDataJSON),
          attestationObject: toBase64Url(response.attestationObject)
        }),
        label: "This device",
        transports
      };

      const res = await apiFetch("/api/auth/passkeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        includeCsrf: true,
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      setLoadingAction("");
      if (!res.ok) {
        showToast(json.message || "Unable to add passkey");
        return;
      }
      showToast("Passkey added successfully.");
      await refreshPasskeys();
    } catch (error) {
      setLoadingAction("");
      const msg = error instanceof Error ? error.message : "Passkey registration failed.";
      showToast(msg);
    }
  }

  async function removePasskey(id: string) {
    setLoadingAction(`passkey-del:${id}`);
    const res = await apiFetch(`/api/auth/passkeys?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      includeCsrf: true
    });
    const json = await res.json();
    setLoadingAction("");
    if (!res.ok) {
      showToast(json.message || "Unable to remove passkey");
      return;
    }
    showToast("Passkey removed.");
    await refreshPasskeys();
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
      <h1 className="text-3xl font-semibold">{t("settings.title", "Settings")}</h1>

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`rounded-2xl px-4 py-2 text-sm ${tab === item ? "bg-primary text-white" : "border border-border bg-card"}`}
          >
            {item === "Account"
              ? t("settings.account", item)
              : item === "Notifications"
                ? t("settings.notifications", item)
                : item === "Privacy"
                  ? t("settings.privacy", item)
                  : item === "Security"
                    ? t("settings.security", item)
                  : item === "Subscription"
                    ? t("settings.subscription", item)
                    : t("settings.delete_account", item)}
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
            {runtimeConfig?.notifications?.inAppEnabled === false ? (
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground/70">
                In-app notifications are currently disabled by admin.
              </p>
            ) : null}
            {runtimeConfig?.notifications?.quietHoursEnabled ? (
              <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-foreground/70">
                Quiet hours active: {runtimeConfig.notifications.quietHoursStart || "22:00"} - {runtimeConfig.notifications.quietHoursEnd || "08:00"}
              </p>
            ) : null}
            <div className="grid gap-2">
              {[
                ["emailMessages", "Email for new messages"],
                ["emailMatches", "Email for new matches"],
                ["emailPromotions", "Email promotions and offers"],
                ["pushMessages", "Push for new messages"],
                ["pushMatches", "Push for new matches"]
              ].map(([key, label]) => (
                <label key={key} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span>{label}{!notificationGuards[key as keyof typeof notificationGuards] ? " (Disabled by admin)" : ""}</span>
                  <input
                    type="checkbox"
                    checked={
                      notificationGuards[key as keyof typeof notificationGuards]
                        ? Boolean(settings.notifications[key as keyof ProfileSettings["notifications"]])
                        : false
                    }
                    onChange={(event) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifications: {
                          ...prev.notifications,
                          [key]: event.target.checked
                        }
                      }))
                    }
                    disabled={!notificationGuards[key as keyof typeof notificationGuards]}
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

        {tab === "Security" ? (
          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-primary" /> Security</p>
            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Passkey login</p>
              <p className="mt-1 text-sm text-foreground/70">
                Status: {passkeyFeatureEnabled ? "Enabled" : "Disabled by admin"}
              </p>
              <button
                onClick={addPasskey}
                disabled={!passkeyFeatureEnabled || loadingAction === "passkey-add"}
                className="mt-3 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {loadingAction === "passkey-add" ? "Adding..." : "Add this device as passkey"}
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-semibold">Registered passkeys</p>
              <div className="mt-3 space-y-2">
                {passkeys.length ? (
                  passkeys.map((item) => (
                    <div key={item._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                      <div>
                        <p className="font-semibold">{item.label || "My device"}</p>
                        <p className="text-xs text-foreground/65">
                          Added {item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"}
                          {item.lastUsedAt ? ` • Last used ${new Date(item.lastUsedAt).toLocaleString()}` : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => removePasskey(item._id)}
                        disabled={loadingAction === `passkey-del:${item._id}`}
                        className="inline-flex h-9 items-center rounded-xl border border-red-300 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:hover:bg-red-950/30"
                      >
                        {loadingAction === `passkey-del:${item._id}` ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-foreground/65">No passkeys added yet.</p>
                )}
              </div>
            </div>
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

            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold">My package details</p>
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <div className="rounded-xl border border-border bg-card px-3 py-2">
                  <p className="text-xs text-foreground/65">Plan type</p>
                  <p className="font-semibold">{subLabel}</p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-2">
                  <p className="text-xs text-foreground/65">Billing status</p>
                  <p className="font-semibold">{me?.subscription?.status || "none"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-2">
                  <p className="text-xs text-foreground/65">Auto renew</p>
                  <p className="font-semibold">{me?.subscription?.cancelAtPeriodEnd ? "Off (will cancel)" : "On"}</p>
                </div>
                <div className="rounded-xl border border-border bg-card px-3 py-2">
                  <p className="text-xs text-foreground/65">Renewal date</p>
                  <p className="font-semibold">
                    {me?.subscription?.currentPeriodEnd ? new Date(me.subscription.currentPeriodEnd).toLocaleDateString() : "n/a"}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/upgrade" className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90">
                  View all packages
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => cancelOrResume(true)} disabled={loadingAction.length > 0 || me?.subscriptionPlan === "free"} className="inline-flex h-10 items-center rounded-2xl border border-border px-4 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                {loadingAction === "cancel" ? "Cancelling..." : "Cancel at period end"}
              </button>
              <button onClick={() => cancelOrResume(false)} disabled={loadingAction.length > 0 || me?.subscriptionPlan === "free"} className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">
                {loadingAction === "resume" ? "Saving..." : "Resume subscription"}
              </button>
            </div>

            <div className="rounded-2xl border border-border bg-muted/30 p-4">
              <p className="text-sm font-semibold">Payments and invoices</p>
              <p className="mt-1 text-sm text-foreground/70">Payment history is now available on a separate billing page.</p>
              <Link href="/app/billing" className="mt-3 inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold hover:bg-muted">
                Open billing & history
              </Link>
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
