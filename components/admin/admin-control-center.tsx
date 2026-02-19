"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bell,
  Coins,
  DollarSign,
  Eye,
  Filter,
  Globe2,
  Heart,
  Mail,
  MessageCircle,
  PlusCircle,
  RefreshCcw,
  Search,
  Shield,
  Smartphone,
  Sparkles,
  X,
  Users2
} from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { BadgePremium } from "@/components/ui/badge-premium";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";

type UserRole = "user" | "admin" | "super_admin";
type AccountStatus = "active" | "deactivated" | "disabled";
type PricingKind = "coin" | "subscription";
type SubscriptionKey = "gold" | "platinum";
type SubscriptionPlan = "free" | "gold" | "platinum";
type SubscriptionStatus = "none" | "active" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
export type AdminTab = "overview" | "users" | "pricing" | "settings" | "payments";
type SettingsSection = "coins" | "smtp" | "payment_gateway" | "offers" | "system" | "notifications" | "localization" | "templates";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  isVerified: boolean;
  createdAt?: string;
  deletedAt?: string | null;
  subscriptionPlan?: SubscriptionPlan;
  subscription?: {
    status?: SubscriptionStatus;
    provider?: string;
    monthlyAmount?: number;
    currency?: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
  };
};

type PricingPlan = {
  _id: string;
  key: string;
  kind: PricingKind;
  label: string;
  badge?: string;
  amount: number;
  currency: string;
  coins?: number;
  extra?: number;
  subscriptionKey?: SubscriptionKey | null;
  stripePriceId?: string | null;
  active: boolean;
  sortOrder: number;
};

type AppSetting = {
  _id: string;
  key: string;
  group?: string;
  valueType?: "number" | "string" | "boolean";
  label: string;
  description?: string;
  numberValue?: number | null;
  stringValue?: string | null;
  booleanValue?: boolean | null;
};

type DashboardMetrics = {
  users: number;
  activeUsers: number;
  verifiedUsers: number;
  onlineUsers: number;
  likes: number;
  matches: number;
  messages: number;
  revenueCents: number;
  payments: number;
  paymentSucceeded: number;
  paymentPending: number;
  paymentFailed: number;
  goldUsers: number;
  platinumUsers: number;
  activeSubscriptions: number;
};

type DashboardRecentUser = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  subscriptionPlan?: SubscriptionPlan;
  createdAt?: string;
};

type DashboardRecentPayment = {
  _id: string;
  type: "subscription" | "coin";
  amount: number;
  status: string;
  provider: string;
  coinsAdded?: number;
  subscriptionPlan?: string | null;
  paidAt?: string;
  createdAt?: string;
  userId?: { name?: string; email?: string } | string | null;
};

type DashboardActivityItem = {
  id: string;
  type: "user_registered" | "subscription_payment" | "coin_payment";
  title: string;
  subtitle: string;
  at?: string;
};

type AdminPayment = {
  _id: string;
  type: "subscription" | "coin";
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded" | "canceled";
  provider: string;
  invoiceId?: string | null;
  referenceId: string;
  packageId?: string | null;
  coinsAdded?: number;
  subscriptionPlan?: string | null;
  stripeCheckoutSessionId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeInvoiceId?: string | null;
  stripeSubscriptionId?: string | null;
  paidAt?: string;
  createdAt?: string;
  metadata?: Record<string, unknown>;
  user: { name: string; email: string };
};

const roleOptions: UserRole[] = ["user", "admin", "super_admin"];
const statusOptions: AccountStatus[] = ["active", "deactivated", "disabled"];
const subscriptionPlanOptions: SubscriptionPlan[] = ["free", "gold", "platinum"];
const subscriptionStatusOptions: SubscriptionStatus[] = ["none", "active", "past_due", "canceled", "incomplete", "incomplete_expired", "trialing", "unpaid", "paused"];
const tabMeta: Record<AdminTab, { title: string; subtitle: string }> = {
  overview: {
    title: "Application Management Suite",
    subtitle: "Complete management for users, pricing, coin rules and payment activity."
  },
  users: {
    title: "Users",
    subtitle: "Create users, update roles, account status, and subscription access."
  },
  pricing: {
    title: "Pricing",
    subtitle: "Manage coin packages, subscriptions, and active pricing plans."
  },
  settings: {
    title: "Settings",
    subtitle: "Configure coin rules, SMTP, Stripe, and limited-offer behavior."
  },
  payments: {
    title: "Payments",
    subtitle: "Track revenue and recent payment activity."
  }
};

function paymentStatusPill(status: AdminPayment["status"]) {
  if (status === "succeeded") return "border-emerald-500/35 bg-emerald-500/12 text-emerald-700 dark:text-emerald-300";
  if (status === "pending") return "border-amber-500/35 bg-amber-500/12 text-amber-700 dark:text-amber-300";
  if (status === "failed") return "border-rose-500/35 bg-rose-500/12 text-rose-700 dark:text-rose-300";
  if (status === "refunded") return "border-sky-500/35 bg-sky-500/12 text-sky-700 dark:text-sky-300";
  return "border-slate-500/35 bg-slate-500/12 text-slate-700 dark:text-slate-300";
}

function formatMoney(amountCents: number, currency = "USD") {
  const amount = (amountCents || 0) / 100;
  const code = (currency || "USD").toUpperCase();
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${code} ${amount.toFixed(2)}`;
  }
}

function StatCard({ title, value, hint, icon }: { title: string; value: string | number; hint: string; icon: React.ReactNode }) {
  return (
    <article className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-wider text-foreground/60">{title}</p>
        <span className="text-primary">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold leading-none">{value}</p>
      <p className="mt-2 text-xs text-foreground/60">{hint}</p>
    </article>
  );
}

function AdminOverviewSkeleton() {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={`ov1-${i}`} className="rounded-2xl border border-border bg-card/70 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-9 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </article>
        ))}
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={`ov2-${i}`} className="rounded-2xl border border-border bg-card/70 p-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-3 h-9 w-24" />
            <Skeleton className="mt-2 h-3 w-36" />
          </article>
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <article key={`ov3-${i}`} className="rounded-2xl border border-border bg-card/70 p-4">
            <Skeleton className="h-5 w-28" />
            {Array.from({ length: 5 }).map((__, j) => (
              <Skeleton key={`ov3-${i}-${j}`} className="mt-2 h-10 w-full" />
            ))}
          </article>
        ))}
      </section>
    </>
  );
}

function AdminUsersSkeleton() {
  return (
    <section className="space-y-4">
      <article className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-11 min-w-[220px] flex-1" />
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-36" />
          <Skeleton className="h-11 w-28" />
        </div>
      </article>
      <article className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
        <div className="mt-3 rounded-2xl border border-border/70 p-3">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="mt-2 h-14 w-full" />
          ))}
        </div>
      </article>
    </section>
  );
}

function AdminPricingSkeleton() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
      <article className="rounded-2xl border border-border bg-card/70 p-4">
        <Skeleton className="h-6 w-44" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </article>
      <article className="rounded-2xl border border-border bg-card/70 p-4">
        <Skeleton className="h-6 w-36" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </article>
    </section>
  );
}

function AdminSettingsSkeleton() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, col) => (
        <article key={col} className="rounded-2xl border border-border bg-card/70 p-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="mt-2 h-4 w-64" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 5 }).map((__, i) => (
              <div key={i} className="rounded-xl border border-border p-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-52" />
                <Skeleton className="mt-2 h-10 w-full" />
              </div>
            ))}
          </div>
        </article>
      ))}
    </section>
  );
}

function AdminPaymentsSkeleton() {
  return (
    <section className="grid gap-4 xl:grid-cols-[1fr_2fr]">
      <article className="rounded-2xl border border-border bg-card/70 p-4">
        <Skeleton className="h-6 w-44" />
        <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
      </article>
      <article className="rounded-2xl border border-border bg-card/70 p-4">
        <Skeleton className="h-6 w-36" />
        <div className="mt-3 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </article>
    </section>
  );
}

export function AdminControlCenter({ tab }: { tab: AdminTab }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [actorRole, setActorRole] = useState<UserRole>("admin");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");
  const [subscriptionFilter, setSubscriptionFilter] = useState<"all" | SubscriptionPlan>("all");
  const [verifiedFilter, setVerifiedFilter] = useState<"all" | "verified" | "unverified">("all");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
  const [planDrafts, setPlanDrafts] = useState<Record<string, Partial<PricingPlan>>>({});
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    key: "",
    kind: "coin" as PricingKind,
    label: "",
    badge: "",
    amount: 499,
    currency: "usd",
    coins: 290,
    extra: 0,
    subscriptionKey: "gold" as SubscriptionKey,
    stripePriceId: "",
    sortOrder: 100
  });

  const [appSettings, setAppSettings] = useState<AppSetting[]>([]);
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [dashboardRecentUsers, setDashboardRecentUsers] = useState<DashboardRecentUser[]>([]);
  const [dashboardRecentPayments, setDashboardRecentPayments] = useState<DashboardRecentPayment[]>([]);
  const [dashboardActivity, setDashboardActivity] = useState<DashboardActivityItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [paymentStats, setPaymentStats] = useState({
    total: 0,
    succeeded: 0,
    pending: 0,
    failed: 0,
    revenueCents: 0
  });
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "pending" | "succeeded" | "failed" | "refunded" | "canceled">("all");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUser | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Pick<AdminUser, "_id" | "name" | "email"> | null>(null);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("coins");
  const [smtpTestTo, setSmtpTestTo] = useState("");
  const [smtpTesting, setSmtpTesting] = useState(false);

  function csrfHeaders() {
    const token = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("velora_csrf="))
      ?.split("=")[1];
    const headers: Record<string, string> = {};
    if (token) headers["x-csrf-token"] = decodeURIComponent(token);
    return headers;
  }

  async function loadUsers() {
    setLoadingUsers(true);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setUsers(json.data.users || []);
      setActorRole(json.data.actorRole || "admin");
    } else {
      setMessage(json.message || "Failed to load users");
    }
    setLoadingUsers(false);
  }

  async function loadDashboard() {
    setDashboardLoading(true);
    const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setDashboard(json.data?.metrics || null);
      setDashboardRecentUsers(json.data?.recentUsers || []);
      setDashboardRecentPayments(json.data?.recentPayments || []);
      setDashboardActivity(json.data?.recentActivity || []);
    }
    setDashboardLoading(false);
  }

  async function loadAppSettings() {
    setSettingsLoading(true);
    const res = await fetch("/api/admin/app-settings", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to load app settings");
      setSettingsLoading(false);
      return;
    }
    setAppSettings(json.data?.settings || []);
    setSettingsLoading(false);
  }

  async function loadPricingPlans() {
    setPricingLoading(true);
    const res = await fetch("/api/admin/pricing-plans", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to load pricing plans");
      setPricingLoading(false);
      return;
    }
    setPricingPlans(json.data?.plans || []);
    setPricingLoading(false);
  }

  const loadPayments = useCallback(async () => {
    setPaymentsLoading(true);
    const params = new URLSearchParams();
    if (paymentStatusFilter !== "all") params.set("status", paymentStatusFilter);
    if (paymentQuery.trim()) params.set("q", paymentQuery.trim());
    const res = await fetch(`/api/admin/payments?${params.toString()}`, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to load payments");
      setPaymentsLoading(false);
      return;
    }
    setPayments(json.data?.items || []);
    setPaymentStats(
      json.data?.stats || {
        total: 0,
        succeeded: 0,
        pending: 0,
        failed: 0,
        revenueCents: 0
      }
    );
    setPaymentsLoading(false);
  }, [paymentQuery, paymentStatusFilter]);

  useEffect(() => {
    loadUsers();
    loadDashboard();
    loadAppSettings();
    loadPricingPlans();
  }, []);

  useEffect(() => {
    if (tab !== "payments") return;
    loadPayments();
  }, [tab, loadPayments]);

  useEffect(() => {
    if (!message.trim()) return;
    const timer = setTimeout(() => setMessage(""), 1800);
    return () => clearTimeout(timer);
  }, [message]);

  async function updateUser(
    id: string,
    patch: Partial<{
      role: UserRole;
      accountStatus: AccountStatus;
      isVerified: boolean;
      subscriptionPlan: SubscriptionPlan;
      subscriptionStatus: SubscriptionStatus;
    }>
  ) {
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify(patch)
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Update failed");
      return;
    }
    setMessage("User updated");
    await loadUsers();
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE", headers: csrfHeaders() });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Delete failed");
      return;
    }
    setMessage("User deleted");
    await loadUsers();
    await loadDashboard();
  }

  async function createPricingPlan() {
    const payload =
      pricingForm.kind === "coin"
        ? {
            key: pricingForm.key,
            kind: pricingForm.kind,
            label: pricingForm.label,
            badge: pricingForm.badge,
            amount: pricingForm.amount,
            currency: pricingForm.currency,
            coins: pricingForm.coins,
            extra: pricingForm.extra,
            sortOrder: pricingForm.sortOrder
          }
        : {
            key: pricingForm.key,
            kind: pricingForm.kind,
            label: pricingForm.label,
            badge: pricingForm.badge,
            amount: pricingForm.amount,
            currency: pricingForm.currency,
            subscriptionKey: pricingForm.subscriptionKey,
            stripePriceId: pricingForm.stripePriceId,
            sortOrder: pricingForm.sortOrder
          };

    const res = await fetch("/api/admin/pricing-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to create pricing plan");
      return;
    }

    setMessage("Pricing plan created");
    setPricingForm({
      key: "",
      kind: "coin",
      label: "",
      badge: "",
      amount: 499,
      currency: "usd",
      coins: 290,
      extra: 0,
      subscriptionKey: "gold",
      stripePriceId: "",
      sortOrder: 100
    });
    setShowCreatePlanModal(false);
    await loadPricingPlans();
  }

  async function patchPricingPlan(id: string, patch: Partial<PricingPlan>) {
    const res = await fetch(`/api/admin/pricing-plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify(patch)
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to update pricing plan");
      return;
    }
    setMessage("Pricing plan updated");
    await loadPricingPlans();
  }

  async function removePricingPlan(id: string) {
    const res = await fetch(`/api/admin/pricing-plans/${id}`, {
      method: "DELETE",
      headers: csrfHeaders()
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to delete pricing plan");
      return;
    }
    setMessage("Pricing plan deleted");
    await loadPricingPlans();
  }

  function updatePlanDraft(id: string, patch: Partial<PricingPlan>) {
    setPlanDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...patch
      }
    }));
  }

  function resetPlanDraft(id: string) {
    setPlanDrafts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function savePlanDraft(id: string) {
    const patch = planDrafts[id];
    if (!patch || Object.keys(patch).length === 0) return;
    await patchPricingPlan(id, patch);
    resetPlanDraft(id);
  }

  async function updateAppSetting(setting: AppSetting, value: string | number | boolean) {
    let payload: Record<string, unknown> = { key: setting.key };
    if (setting.valueType === "string") payload = { ...payload, stringValue: String(value ?? "") };
    else if (setting.valueType === "boolean") payload = { ...payload, booleanValue: Boolean(value) };
    else payload = { ...payload, numberValue: Number(value || 0) };

    const res = await fetch("/api/admin/app-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to update setting");
      return;
    }
    setMessage(`${setting.label} updated`);
    await loadAppSettings();
  }

  async function runSmtpTest() {
    setSmtpTesting(true);
    const res = await fetch("/api/admin/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ to: smtpTestTo.trim() || undefined })
    });
    const json = await res.json();
    setSmtpTesting(false);
    if (!res.ok) {
      setMessage(json.message || "SMTP test failed");
      return;
    }
    setMessage(`SMTP test email sent to ${json.data?.to || "recipient"}`);
  }

  const canManageRoles = actorRole === "super_admin";

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = query.trim().toLowerCase();
      const queryMatch = !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      const statusMatch = statusFilter === "all" || user.accountStatus === statusFilter;
      const subscriptionMatch = subscriptionFilter === "all" || (user.subscriptionPlan || "free") === subscriptionFilter;
      const verifiedMatch = verifiedFilter === "all" || (verifiedFilter === "verified" ? user.isVerified : !user.isVerified);
      return queryMatch && roleMatch && statusMatch && subscriptionMatch && verifiedMatch;
    });
  }, [users, query, roleFilter, statusFilter, subscriptionFilter, verifiedFilter]);

  const userStats = useMemo(() => {
    const active = users.filter((user) => user.accountStatus === "active").length;
    const admins = users.filter((user) => user.role === "admin" || user.role === "super_admin").length;
    const disabled = users.filter((user) => user.accountStatus === "disabled").length;
    return { total: users.length, active, admins, disabled };
  }, [users]);

  const coinSettings = useMemo(() => appSettings.filter((setting) => setting.group === "coins"), [appSettings]);
  const integrationSettings = useMemo(() => appSettings.filter((setting) => setting.group === "integrations"), [appSettings]);
  const smtpSettings = useMemo(
    () => integrationSettings.filter((setting) => setting.key.startsWith("integrations.smtp_")),
    [integrationSettings]
  );
  const paymentGatewaySettings = useMemo(
    () => integrationSettings.filter((setting) => setting.key.startsWith("integrations.stripe_")),
    [integrationSettings]
  );
  const offerSettings = useMemo(() => appSettings.filter((setting) => setting.group === "offers"), [appSettings]);
  const systemSettings = useMemo(() => appSettings.filter((setting) => setting.group === "system"), [appSettings]);
  const notificationSettings = useMemo(() => appSettings.filter((setting) => setting.group === "notifications"), [appSettings]);
  const localizationSettings = useMemo(() => appSettings.filter((setting) => setting.group === "localization"), [appSettings]);
  const emailTemplateSettings = useMemo(() => appSettings.filter((setting) => setting.group === "email_templates"), [appSettings]);
  const notificationBooleanSettings = useMemo(
    () => notificationSettings.filter((setting) => setting.valueType === "boolean"),
    [notificationSettings]
  );
  const notificationTextSettings = useMemo(
    () => notificationSettings.filter((setting) => setting.valueType === "string"),
    [notificationSettings]
  );
  const coinPlansCount = useMemo(() => pricingPlans.filter((plan) => plan.kind === "coin").length, [pricingPlans]);
  const subscriptionPlansCount = useMemo(() => pricingPlans.filter((plan) => plan.kind === "subscription").length, [pricingPlans]);
  const activePlansCount = useMemo(() => pricingPlans.filter((plan) => plan.active).length, [pricingPlans]);
  const currentMessageCost = coinSettings.find((item) => item.key === "coins.message_cost")?.numberValue ?? 50;
  const currentUnlockCost = coinSettings.find((item) => item.key === "coins.profile_unlock_cost")?.numberValue ?? 70;
  const stripeEnabled = integrationSettings.find((item) => item.key === "integrations.stripe_enabled")?.booleanValue ?? true;
  const otpLoginRequired = systemSettings.find((item) => item.key === "system.require_otp_login")?.booleanValue ?? false;
  const otpRegisterRequired = systemSettings.find((item) => item.key === "system.require_otp_registration")?.booleanValue ?? true;
  const passkeyEnabled = systemSettings.find((item) => item.key === "system.passkey_enabled")?.booleanValue ?? false;
  const invoiceEmailEnabled = systemSettings.find((item) => item.key === "system.send_payment_invoice_email")?.booleanValue ?? true;
  const inAppNotificationEnabled = notificationSettings.find((item) => item.key === "notifications.in_app_enabled")?.booleanValue ?? true;
  const pushNotificationEnabled = notificationSettings.find((item) => item.key === "notifications.push_enabled")?.booleanValue ?? true;
  const emailNotificationEnabled = notificationSettings.find((item) => item.key === "notifications.email_enabled")?.booleanValue ?? true;
  const settingsTabs: Array<{ key: SettingsSection; label: string; count: number }> = [
    { key: "coins", label: "Coin Rules", count: coinSettings.length },
    { key: "notifications", label: "Notifications", count: notificationSettings.length },
    { key: "smtp", label: "SMTP", count: smtpSettings.length },
    { key: "payment_gateway", label: "Payment Gateway", count: paymentGatewaySettings.length },
    { key: "offers", label: "Offers", count: offerSettings.length },
    { key: "system", label: "System Policy", count: systemSettings.length },
    { key: "localization", label: "Localization", count: localizationSettings.length },
    { key: "templates", label: "Email Templates", count: emailTemplateSettings.length }
  ];

  const activeSettingsMeta = useMemo(() => {
    if (settingsSection === "coins") return { title: "Coin Rules", description: "Dynamic cost controls for message and profile unlock flows.", count: coinSettings.length };
    if (settingsSection === "notifications") return { title: "Notifications", description: "Dynamic notification channels, event toggles, and quiet-hours policy.", count: notificationSettings.length };
    if (settingsSection === "smtp") return { title: "SMTP", description: "Manage SMTP server, auth, and sender configuration.", count: smtpSettings.length };
    if (settingsSection === "payment_gateway") return { title: "Payment Gateway", description: "Manage Stripe keys and payment gateway controls.", count: paymentGatewaySettings.length };
    if (settingsSection === "offers") return { title: "Limited Offer Banner", description: "Editable offer banner and direct checkout values used in app pages.", count: offerSettings.length };
    if (settingsSection === "system") return { title: "Auth & Notification Policy", description: "Configure OTP rules, passkey enablement, and invoice email behavior.", count: systemSettings.length };
    if (settingsSection === "localization") return { title: "Localization & Currency", description: "Control default language, enabled languages, locale, and default currency.", count: localizationSettings.length };
    return { title: "Email Templates", description: "Dynamic template module with editable subject and HTML placeholders.", count: emailTemplateSettings.length };
  }, [settingsSection, coinSettings.length, notificationSettings.length, smtpSettings.length, paymentGatewaySettings.length, offerSettings.length, systemSettings.length, localizationSettings.length, emailTemplateSettings.length]);

  return (
    <main className="space-y-6">
      {tab === "overview" ? (
        <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent p-6">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Admin Center</p>
              <h1 className="mt-2 text-3xl font-semibold">{tabMeta[tab].title}</h1>
              <p className="mt-2 text-sm text-foreground/70">{tabMeta[tab].subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <BadgePremium />
              <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{actorRole}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3">
          <div>
            <h1 className="text-2xl font-semibold">{tabMeta[tab].title}</h1>
            <p className="text-sm text-foreground/70">{tabMeta[tab].subtitle}</p>
          </div>
          <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{actorRole}</span>
        </section>
      )}

      {tab === "overview" ? (
        <>
          {dashboardLoading || loadingUsers ? (
            <AdminOverviewSkeleton />
          ) : (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Total Users" value={userStats.total} hint="Registered accounts" icon={<Users2 className="h-4 w-4" />} />
                <StatCard title="Active Users" value={userStats.active} hint="Currently enabled" icon={<Shield className="h-4 w-4" />} />
                <StatCard title="Admins" value={userStats.admins} hint="Privileged operators" icon={<Sparkles className="h-4 w-4" />} />
                <StatCard title="Disabled" value={userStats.disabled} hint="Need attention" icon={<Activity className="h-4 w-4" />} />
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Likes" value={dashboard?.likes ?? 0} hint="Total like actions" icon={<Heart className="h-4 w-4" />} />
                <StatCard title="Matches" value={dashboard?.matches ?? 0} hint="Active match records" icon={<Users2 className="h-4 w-4" />} />
                <StatCard title="Messages" value={dashboard?.messages ?? 0} hint="Stored chat messages" icon={<MessageCircle className="h-4 w-4" />} />
                <StatCard title="Revenue" value={formatMoney(dashboard?.revenueCents || 0)} hint="Succeeded payments" icon={<DollarSign className="h-4 w-4" />} />
              </section>

              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Active Subs" value={dashboard?.activeSubscriptions ?? 0} hint="active + trialing + past_due" icon={<Sparkles className="h-4 w-4" />} />
                <StatCard title="Gold Users" value={dashboard?.goldUsers ?? 0} hint="Users on Gold plan" icon={<Shield className="h-4 w-4" />} />
                <StatCard title="Platinum Users" value={dashboard?.platinumUsers ?? 0} hint="Users on Platinum plan" icon={<Shield className="h-4 w-4" />} />
                <StatCard title="Pending Pays" value={dashboard?.paymentPending ?? 0} hint="Payments awaiting completion" icon={<Activity className="h-4 w-4" />} />
              </section>

              <section className="grid gap-4 xl:grid-cols-3">
                <article className="rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-lg font-semibold">Recent activity</p>
                  <div className="mt-3 space-y-2">
                    {dashboardActivity.length ? (
                      dashboardActivity.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border p-3">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs text-foreground/65">{item.subtitle}</p>
                          <p className="mt-1 text-xs text-foreground/55">{new Date(item.at || Date.now()).toLocaleString()}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-foreground/70">No recent activity.</p>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-lg font-semibold">Recent registrations</p>
                  <div className="mt-3 space-y-2">
                    {dashboardRecentUsers.length ? (
                      dashboardRecentUsers.map((user) => (
                        <div key={user._id} className="rounded-xl border border-border p-3">
                          <p className="text-sm font-semibold">{user.name}</p>
                          <p className="text-xs text-foreground/65">{user.email}</p>
                          <p className="mt-1 text-xs text-foreground/55">
                            {user.role} • {user.subscriptionPlan || "free"} • {new Date(user.createdAt || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-foreground/70">No recent users.</p>
                    )}
                  </div>
                </article>

                <article className="rounded-2xl border border-border bg-card/70 p-4">
                  <p className="text-lg font-semibold">Recent payments</p>
                  <div className="mt-3 space-y-2">
                    {dashboardRecentPayments.length ? (
                      dashboardRecentPayments.map((payment) => (
                        <div key={payment._id} className="rounded-xl border border-border p-3">
                          <p className="text-sm font-semibold">
                            {payment.type === "coin"
                              ? `Coin payment${payment.coinsAdded ? ` (+${payment.coinsAdded})` : ""}`
                              : `Subscription ${payment.subscriptionPlan || ""}`}
                          </p>
                          <p className="text-xs text-foreground/65">
                            {typeof payment.userId === "object" && payment.userId
                              ? payment.userId.name || payment.userId.email || "Unknown user"
                              : "Unknown user"}
                          </p>
                          <p className="mt-1 text-xs text-foreground/55">
                            {formatMoney(payment.amount)} • {payment.status} • {new Date(payment.paidAt || payment.createdAt || Date.now()).toLocaleString()}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-foreground/70">No recent payments.</p>
                    )}
                  </div>
                </article>
              </section>
            </>
          )}
        </>
      ) : null}

      {tab === "users" ? (
        loadingUsers ? (
          <AdminUsersSkeleton />
        ) : (
          <section className="space-y-4">
            <article className="rounded-2xl border border-border bg-card/70 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">User operations</p>
                  <p className="text-xs text-foreground/65">Filter, edit, verify, and manage subscriptions in one flow.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm" onClick={loadUsers}>
                    <RefreshCcw className="h-4 w-4" /> Refresh
                  </button>
                </div>
              </div>

              <div className="mt-3 grid gap-2 lg:grid-cols-6">
                <div className="relative lg:col-span-2">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                  <Input className="pl-9" placeholder="Search by name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
                </div>
                <select className="h-11 rounded-xl border border-border bg-background px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | UserRole)}>
                  <option value="all">Role: all</option>
                  {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <select className="h-11 rounded-xl border border-border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | AccountStatus)}>
                  <option value="all">Status: all</option>
                  {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
                <select className="h-11 rounded-xl border border-border bg-background px-3 text-sm" value={subscriptionFilter} onChange={(event) => setSubscriptionFilter(event.target.value as "all" | SubscriptionPlan)}>
                  <option value="all">Plan: all</option>
                  {subscriptionPlanOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                </select>
                <select className="h-11 rounded-xl border border-border bg-background px-3 text-sm" value={verifiedFilter} onChange={(event) => setVerifiedFilter(event.target.value as "all" | "verified" | "unverified")}>
                  <option value="all">Verification: all</option>
                  <option value="verified">verified</option>
                  <option value="unverified">unverified</option>
                </select>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs">
                  <Filter className="h-3 w-3" /> {filteredUsers.length} filtered
                </span>
                <span className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs">
                  Active {filteredUsers.filter((user) => user.accountStatus === "active").length}
                </span>
                <span className="inline-flex rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs">
                  Verified {filteredUsers.filter((user) => user.isVerified).length}
                </span>
                <button
                  className="inline-flex rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted"
                  onClick={() => {
                    setQuery("");
                    setRoleFilter("all");
                    setStatusFilter("all");
                    setSubscriptionFilter("all");
                    setVerifiedFilter("all");
                  }}
                >
                  Reset filters
                </button>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-card/70 p-4">
              <div className="overflow-x-auto rounded-2xl border border-border/70">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-foreground/65">
                    <tr>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Account</th>
                      <th className="px-4 py-3 text-left">Subscription</th>
                      <th className="px-4 py-3 text-left">Verification</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length ? (
                      filteredUsers.map((user) => (
                        <tr key={user._id} className="border-t border-border/70 align-top">
                          <td className="px-4 py-3">
                            <p className="font-semibold">{user.name}</p>
                            <p className="text-xs text-foreground/70">{user.email}</p>
                          </td>
                         
                          <td className="px-4 py-3">
                            <select className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-xs" value={user.accountStatus} onChange={(event) => updateUser(user._id, { accountStatus: event.target.value as AccountStatus })}>
                              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 flex">
                            <select className="h-9 w-full rounded-xl border border-border bg-background px-2 text-xs" value={user.subscriptionPlan || "free"} onChange={(event) => updateUser(user._id, { subscriptionPlan: event.target.value as SubscriptionPlan })}>
                              {subscriptionPlanOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                            </select>
                            <select className="mt-2 h-9 w-full rounded-xl border border-border bg-background px-2 text-xs" value={user.subscription?.status || "none"} onChange={(event) => updateUser(user._id, { subscriptionStatus: event.target.value as SubscriptionStatus })}>
                              {subscriptionStatusOptions.map((subStatus) => <option key={subStatus} value={subStatus}>{subStatus}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <button className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${user.isVerified ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-primary/40 bg-primary/10 text-primary/80"}`} onClick={() => updateUser(user._id, { isVerified: !user.isVerified })}>
                              <Shield className="h-3 w-3" /> {user.isVerified ? "Verified" : "Unverified"}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="inline-flex items-center gap-1 rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                                onClick={() => setSelectedUserDetail(user)}
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </button>
                              <button className="rounded-xl border border-amber-500/40 bg-amber-500/15 px-2.5 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-500/20 dark:text-amber-300" onClick={() => updateUser(user._id, { accountStatus: "deactivated" })}>Deactivate</button>
                              <button className="rounded-xl border border-rose-500/40 bg-rose-500/15 px-2.5 py-1.5 text-xs font-semibold text-rose-800 transition hover:bg-rose-500/20 dark:text-rose-300" onClick={() => updateUser(user._id, { accountStatus: "disabled" })}>Disable</button>
                              <button className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-500/20 dark:text-emerald-300" onClick={() => updateUser(user._id, { accountStatus: "active" })}>Activate</button>
                              <button className="rounded-xl border border-rose-600/45 bg-rose-600/15 px-2.5 py-1.5 text-xs font-semibold text-rose-900 transition hover:bg-rose-600/25 dark:text-rose-200 disabled:opacity-40" onClick={() => setDeleteCandidate({ _id: user._id, name: user.name, email: user.email })} disabled={!canManageRoles}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="px-4 py-8 text-foreground/70" colSpan={5}>No users match current filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

          </section>
        )
      ) : null}

      {tab === "pricing" ? (
        pricingLoading ? (
          <AdminPricingSkeleton />
        ) : (
          <section className="space-y-4">
            <article className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Monetization</p>
                  <p className="mt-1 text-2xl font-semibold">Pricing Control Room</p>
                  <p className="mt-1 text-sm text-foreground/65">Manage packages, subscriptions, and checkout pricing from one place.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card/70 px-3 text-sm" onClick={loadPricingPlans}>
                    <RefreshCcw className="h-4 w-4" /> Reload
                  </button>
                  <GradientButton className="h-10 px-4" onClick={() => setShowCreatePlanModal(true)} disabled={!canManageRoles}>
                    <PlusCircle className="h-4 w-4" /> New Plan
                  </GradientButton>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-card/80 p-3">
                  <p className="text-xs uppercase tracking-wider text-foreground/60">Coin Plans</p>
                  <p className="mt-1 text-2xl font-semibold">{coinPlansCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/80 p-3">
                  <p className="text-xs uppercase tracking-wider text-foreground/60">Subscriptions</p>
                  <p className="mt-1 text-2xl font-semibold">{subscriptionPlansCount}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card/80 p-3">
                  <p className="text-xs uppercase tracking-wider text-foreground/60">Active Plans</p>
                  <p className="mt-1 text-2xl font-semibold">{activePlansCount}</p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl border border-border bg-card/70 p-4">
              <div className="space-y-4">
                {pricingPlans.length ? (
                  pricingPlans.map((plan) => {
                    const draft = planDrafts[plan._id] || {};
                    const hasDraft = Object.keys(draft).length > 0;
                    return (
                      <div key={plan._id} className="rounded-2xl border border-border bg-background/50 p-4">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-base font-semibold">
                              {plan.label} <span className="text-xs text-foreground/60">({plan.key})</span>
                            </p>
                            <p className="text-xs text-foreground/65">
                              {plan.kind === "coin" ? "Coin Package" : "Subscription"} • {formatMoney(plan.amount)} • {plan.currency.toUpperCase()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] ${plan.kind === "coin" ? "border-sky-400/30 bg-sky-500/10 text-sky-300" : "border-primary/30 bg-primary/10 text-primary"}`}>
                              {plan.kind}
                            </span>
                            <label className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1 text-xs">
                              <input
                                type="checkbox"
                                checked={Boolean(draft.active ?? plan.active)}
                                onChange={(event) => updatePlanDraft(plan._id, { active: event.target.checked })}
                                disabled={!canManageRoles}
                              />
                              Active plan
                            </label>
                            <button
                              onClick={() => resetPlanDraft(plan._id)}
                              className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs disabled:opacity-50"
                              disabled={!hasDraft || !canManageRoles}
                            >
                              Reset
                            </button>
                            <button
                              onClick={() => savePlanDraft(plan._id)}
                              className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary disabled:opacity-50"
                              disabled={!hasDraft || !canManageRoles}
                            >
                              Save changes
                            </button>
                            <button onClick={() => removePricingPlan(plan._id)} className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300" disabled={!canManageRoles}>Delete</button>
                          </div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                          <input
                            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                            value={String(draft.label ?? plan.label)}
                            onChange={(event) => updatePlanDraft(plan._id, { label: event.target.value })}
                            disabled={!canManageRoles}
                            placeholder="Label"
                          />
                          <input
                            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                            value={String(draft.badge ?? plan.badge ?? "")}
                            onChange={(event) => updatePlanDraft(plan._id, { badge: event.target.value })}
                            disabled={!canManageRoles}
                            placeholder="Badge"
                          />
                          <input
                            type="number"
                            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                            value={Number(draft.amount ?? plan.amount)}
                            onChange={(event) => updatePlanDraft(plan._id, { amount: Number(event.target.value || 0) })}
                            disabled={!canManageRoles}
                            placeholder="Amount (cents)"
                          />
                          <input
                            type="number"
                            className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                            value={Number(draft.sortOrder ?? plan.sortOrder)}
                            onChange={(event) => updatePlanDraft(plan._id, { sortOrder: Number(event.target.value || 0) })}
                            disabled={!canManageRoles}
                            placeholder="Sort order"
                          />
                          {plan.kind === "coin" ? (
                            <>
                              <input
                                type="number"
                                className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                                value={Number(draft.coins ?? plan.coins ?? 0)}
                                onChange={(event) => updatePlanDraft(plan._id, { coins: Number(event.target.value || 0) })}
                                disabled={!canManageRoles}
                                placeholder="Coins"
                              />
                              <input
                                type="number"
                                className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                                value={Number(draft.extra ?? plan.extra ?? 0)}
                                onChange={(event) => updatePlanDraft(plan._id, { extra: Number(event.target.value || 0) })}
                                disabled={!canManageRoles}
                                placeholder="Bonus %"
                              />
                            </>
                          ) : (
                            <>
                              <select
                                className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                                value={String(draft.subscriptionKey ?? plan.subscriptionKey ?? "gold")}
                                onChange={(event) => updatePlanDraft(plan._id, { subscriptionKey: event.target.value as SubscriptionKey })}
                                disabled={!canManageRoles}
                              >
                                <option value="gold">Gold</option>
                                <option value="platinum">Platinum</option>
                              </select>
                              <input
                                className="h-10 rounded-xl border border-border bg-card px-3 text-sm"
                                value={String(draft.stripePriceId ?? plan.stripePriceId ?? "")}
                                onChange={(event) => updatePlanDraft(plan._id, { stripePriceId: event.target.value })}
                                disabled={!canManageRoles}
                                placeholder="Stripe price ID"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-foreground/70">No plans found.</p>
                )}
              </div>
            </article>

            {showCreatePlanModal ? (
              <div className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4">
                <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-lg font-semibold"><PlusCircle className="h-4 w-4 text-primary" />Add Pricing Plan</p>
                    <button
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
                      onClick={() => setShowCreatePlanModal(false)}
                      aria-label="Close add plan modal"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-4 space-y-2">
                    <input className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Key (e.g. starter_350)" value={pricingForm.key} onChange={(event) => setPricingForm((prev) => ({ ...prev, key: event.target.value }))} />
                    <select className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={pricingForm.kind} onChange={(event) => setPricingForm((prev) => ({ ...prev, kind: event.target.value as PricingKind }))}>
                      <option value="coin">Coin package</option>
                      <option value="subscription">Subscription</option>
                    </select>
                    <input className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Label" value={pricingForm.label} onChange={(event) => setPricingForm((prev) => ({ ...prev, label: event.target.value }))} />
                    <input className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Badge" value={pricingForm.badge} onChange={(event) => setPricingForm((prev) => ({ ...prev, badge: event.target.value }))} />
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Amount cents" value={pricingForm.amount} onChange={(event) => setPricingForm((prev) => ({ ...prev, amount: Number(event.target.value || 0) }))} />
                      <input type="number" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Sort" value={pricingForm.sortOrder} onChange={(event) => setPricingForm((prev) => ({ ...prev, sortOrder: Number(event.target.value || 0) }))} />
                    </div>
                    {pricingForm.kind === "coin" ? (
                      <div className="grid grid-cols-2 gap-2">
                        <input type="number" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Coins" value={pricingForm.coins} onChange={(event) => setPricingForm((prev) => ({ ...prev, coins: Number(event.target.value || 0) }))} />
                        <input type="number" className="h-10 rounded-xl border border-border bg-background px-3 text-sm" placeholder="Extra %" value={pricingForm.extra} onChange={(event) => setPricingForm((prev) => ({ ...prev, extra: Number(event.target.value || 0) }))} />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <select className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={pricingForm.subscriptionKey} onChange={(event) => setPricingForm((prev) => ({ ...prev, subscriptionKey: event.target.value as SubscriptionKey }))}>
                          <option value="gold">Gold</option>
                          <option value="platinum">Platinum</option>
                        </select>
                        <input className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" placeholder="Stripe price ID" value={pricingForm.stripePriceId} onChange={(event) => setPricingForm((prev) => ({ ...prev, stripePriceId: event.target.value }))} />
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button className="h-10 rounded-xl border border-border px-4 text-sm" onClick={() => setShowCreatePlanModal(false)}>Cancel</button>
                      <button onClick={createPricingPlan} className="h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60" disabled={!canManageRoles}>
                        {canManageRoles ? "Create plan" : "Super admin required"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        )
      ) : null}

      {tab === "settings" ? (
        settingsLoading ? (
          <AdminSettingsSkeleton />
        ) : (
          <section className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
            <div className="space-y-3">
              <article className="rounded-2xl border border-border bg-card/70 p-3">
                <div className="flex flex-wrap gap-2">
                  {settingsTabs.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => setSettingsSection(item.key)}
                      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
                        settingsSection === item.key ? "bg-primary text-white" : "border border-border bg-background hover:bg-muted"
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${settingsSection === item.key ? "bg-white/20" : "bg-primary/10 text-primary"}`}>
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>
              </article>

              <article className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card">
                <div className="flex items-center justify-between gap-2 px-4 py-4">
                  <span>
                    <span className="inline-flex items-center gap-2 text-lg font-semibold">
                      {settingsSection === "coins" ? <Coins className="h-4 w-4 text-primary" /> : null}
                      {settingsSection === "notifications" ? <Bell className="h-4 w-4 text-primary" /> : null}
                      {settingsSection === "smtp" ? <Mail className="h-4 w-4 text-primary" /> : null}
                      {settingsSection === "payment_gateway" ? <Shield className="h-4 w-4 text-primary" /> : null}
                      {settingsSection === "offers" ? <Sparkles className="h-4 w-4 text-primary" /> : null}
                      {settingsSection === "system" ? <Shield className="h-4 w-4 text-primary" /> : null}
                      {settingsSection === "localization" ? <Globe2 className="h-4 w-4 text-primary" /> : null}
                      {settingsSection === "templates" ? <Sparkles className="h-4 w-4 text-primary" /> : null}
                      {activeSettingsMeta.title}
                    </span>
                    <span className="mt-1 block text-sm text-foreground/70">{activeSettingsMeta.description}</span>
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[11px] text-primary">{activeSettingsMeta.count} items</span>
                </div>

                <div className="space-y-2 border-t border-border p-4">
                  {settingsSection === "notifications" ? (
                    <>
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className={`rounded-xl border px-3 py-2 text-sm ${inAppNotificationEnabled ? "border-emerald-400/40 bg-emerald-500/10" : "border-border bg-card/70"}`}>
                          <p className="inline-flex items-center gap-1 font-semibold"><Bell className="h-3.5 w-3.5" /> In-App</p>
                          <p className="text-xs text-foreground/65">{inAppNotificationEnabled ? "Enabled" : "Disabled"}</p>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 text-sm ${pushNotificationEnabled ? "border-emerald-400/40 bg-emerald-500/10" : "border-border bg-card/70"}`}>
                          <p className="inline-flex items-center gap-1 font-semibold"><Smartphone className="h-3.5 w-3.5" /> Push</p>
                          <p className="text-xs text-foreground/65">{pushNotificationEnabled ? "Enabled" : "Disabled"}</p>
                        </div>
                        <div className={`rounded-xl border px-3 py-2 text-sm ${emailNotificationEnabled ? "border-emerald-400/40 bg-emerald-500/10" : "border-border bg-card/70"}`}>
                          <p className="inline-flex items-center gap-1 font-semibold"><Mail className="h-3.5 w-3.5" /> Email</p>
                          <p className="text-xs text-foreground/65">{emailNotificationEnabled ? "Enabled" : "Disabled"}</p>
                        </div>
                      </div>
                      <div className="grid gap-2 md:grid-cols-2">
                        {notificationBooleanSettings.map((setting) => (
                          <div key={setting._id} className="rounded-xl border border-border bg-card/80 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold">{setting.label}</p>
                                <p className="text-xs text-foreground/65">{setting.description || setting.key}</p>
                              </div>
                              <label className="inline-flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  className="h-4 w-4"
                                  defaultChecked={Boolean(setting.booleanValue)}
                                  onChange={(event) => updateAppSetting(setting, event.target.checked)}
                                  disabled={!canManageRoles}
                                />
                                Enabled
                              </label>
                            </div>
                          </div>
                        ))}
                        {notificationTextSettings.map((setting) => (
                          <div key={setting._id} className="rounded-xl border border-border bg-card/80 p-3">
                            <p className="text-sm font-semibold">{setting.label}</p>
                            <p className="text-xs text-foreground/65">{setting.description || setting.key}</p>
                            <input
                              type="text"
                              className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                              defaultValue={setting.stringValue || ""}
                              onBlur={(event) => {
                                const next = event.target.value || "";
                                if (next === (setting.stringValue || "")) return;
                                updateAppSetting(setting, next);
                              }}
                              disabled={!canManageRoles}
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  ) : settingsSection === "templates" ? (
                    emailTemplateSettings.map((setting) => (
                      <div key={setting._id} className="rounded-xl border border-border p-3">
                        <p className="text-sm font-semibold">{setting.label}</p>
                        <p className="text-xs text-foreground/65">{setting.description || setting.key}</p>
                        <textarea
                          className="mt-2 min-h-[96px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                          defaultValue={setting.stringValue || ""}
                          onBlur={(event) => {
                            const next = event.target.value || "";
                            if (next === (setting.stringValue || "")) return;
                            updateAppSetting(setting, next);
                          }}
                          disabled={!canManageRoles}
                        />
                      </div>
                    ))
                  ) : (
                    <>
                      {settingsSection === "smtp" ? (
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                          <p className="text-sm font-semibold">Test SMTP</p>
                          <p className="text-xs text-foreground/65">Send a test email using current SMTP settings.</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              type="email"
                              className="h-10 min-w-[240px] flex-1 rounded-xl border border-border bg-background px-3 text-sm"
                              placeholder="Recipient email (blank = your admin email)"
                              value={smtpTestTo}
                              onChange={(event) => setSmtpTestTo(event.target.value)}
                              disabled={!canManageRoles || smtpTesting}
                            />
                            <button
                              onClick={runSmtpTest}
                              disabled={!canManageRoles || smtpTesting}
                              className="inline-flex h-10 items-center rounded-xl border border-primary/35 bg-primary/10 px-3 text-sm font-semibold text-primary disabled:opacity-60"
                            >
                              {smtpTesting ? "Sending..." : "Send test email"}
                            </button>
                          </div>
                        </div>
                      ) : null}

                      {(settingsSection === "coins"
                        ? coinSettings
                        : settingsSection === "smtp"
                          ? smtpSettings
                        : settingsSection === "payment_gateway"
                          ? paymentGatewaySettings
                        : settingsSection === "offers"
                            ? offerSettings
                            : settingsSection === "localization"
                              ? localizationSettings
                            : systemSettings
                      ).map((setting) => (
                        <div key={setting._id} className="rounded-xl border border-border p-3">
                          <p className="text-sm font-semibold">{setting.label}</p>
                          <p className="text-xs text-foreground/65">{setting.description || setting.key}</p>
                          {setting.valueType === "boolean" ? (
                            <label className="mt-2 inline-flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="h-4 w-4"
                                defaultChecked={Boolean(setting.booleanValue)}
                                onChange={(event) => updateAppSetting(setting, event.target.checked)}
                                disabled={!canManageRoles}
                              />
                              Enabled
                            </label>
                          ) : setting.valueType === "string" ? (
                            <input
                              type={setting.key.includes("secret") || setting.key.includes("password") ? "password" : "text"}
                              className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                              defaultValue={setting.stringValue || ""}
                              onBlur={(event) => {
                                const next = event.target.value || "";
                                if (next === (setting.stringValue || "")) return;
                                updateAppSetting(setting, next);
                              }}
                              disabled={!canManageRoles}
                            />
                          ) : (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                type="number"
                                className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                                defaultValue={setting.numberValue ?? 0}
                                onBlur={(event) => {
                                  const next = Number(event.target.value || 0);
                                  if (!Number.isFinite(next)) return;
                                  if (next === (setting.numberValue ?? 0)) return;
                                  updateAppSetting(setting, next);
                                }}
                                disabled={!canManageRoles}
                              />
                              {settingsSection === "coins" ? <span className="text-xs text-foreground/60">coins</span> : null}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </article>
            </div>

            <aside className="space-y-3 xl:sticky xl:top-24 xl:h-fit">
              <article className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Runtime Snapshot</p>
                <div className="mt-3 space-y-2 rounded-2xl border border-border bg-card/70 p-3 text-sm">
                  <p>Message cost: <span className="font-semibold">{currentMessageCost} coins</span></p>
                  <p>Profile unlock: <span className="font-semibold">{currentUnlockCost} coins</span></p>
                  <p>Stripe: <span className={`font-semibold ${stripeEnabled ? "text-emerald-400" : "text-rose-400"}`}>{stripeEnabled ? "Enabled" : "Disabled"}</span></p>
                  <p>OTP login: <span className={`font-semibold ${otpLoginRequired ? "text-emerald-400" : "text-foreground"}`}>{otpLoginRequired ? "Required" : "Not required"}</span></p>
                  <p>OTP registration: <span className={`font-semibold ${otpRegisterRequired ? "text-emerald-400" : "text-foreground"}`}>{otpRegisterRequired ? "Required" : "Not required"}</span></p>
                  <p>Passkey: <span className={`font-semibold ${passkeyEnabled ? "text-emerald-400" : "text-foreground"}`}>{passkeyEnabled ? "Enabled" : "Disabled"}</span></p>
                  <p>Invoice email: <span className={`font-semibold ${invoiceEmailEnabled ? "text-emerald-400" : "text-foreground"}`}>{invoiceEmailEnabled ? "Enabled" : "Disabled"}</span></p>
                  <p>In-app notifications: <span className={`font-semibold ${inAppNotificationEnabled ? "text-emerald-400" : "text-foreground"}`}>{inAppNotificationEnabled ? "Enabled" : "Disabled"}</span></p>
                  <p>Push notifications: <span className={`font-semibold ${pushNotificationEnabled ? "text-emerald-400" : "text-foreground"}`}>{pushNotificationEnabled ? "Enabled" : "Disabled"}</span></p>
                  <p>Email notifications: <span className={`font-semibold ${emailNotificationEnabled ? "text-emerald-400" : "text-foreground"}`}>{emailNotificationEnabled ? "Enabled" : "Disabled"}</span></p>
                </div>
              </article>
              <article className="rounded-3xl border border-border bg-card/70 p-4">
                <p className="text-sm font-semibold">Design Notes</p>
                <ul className="mt-2 space-y-2 text-xs text-foreground/70">
                  <li>Changes save on blur/toggle for fast operations.</li>
                  <li>Use top tabs to navigate all settings modules.</li>
                  <li>Sensitive keys are masked in input fields.</li>
                </ul>
              </article>
            </aside>
          </section>
        )
      ) : null}

      {tab === "payments" ? (
        paymentsLoading ? (
          <AdminPaymentsSkeleton />
        ) : (
          <section className="space-y-4">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Revenue" value={formatMoney(paymentStats.revenueCents)} hint="Succeeded payments only" icon={<DollarSign className="h-4 w-4" />} />
              <StatCard title="Total Records" value={paymentStats.total} hint="Current filter result" icon={<Coins className="h-4 w-4" />} />
              <StatCard title="Succeeded" value={paymentStats.succeeded} hint="Paid successfully" icon={<Shield className="h-4 w-4" />} />
              <StatCard title="Pending" value={paymentStats.pending} hint="Awaiting completion" icon={<Activity className="h-4 w-4" />} />
            </section>

            <article className="rounded-2xl border border-border bg-card/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                  <Input className="pl-9" placeholder="Search user, email, invoice id, reference, provider" value={paymentQuery} onChange={(event) => setPaymentQuery(event.target.value)} />
                </div>
                <select className="h-11 rounded-xl border border-border bg-background px-3 text-sm" value={paymentStatusFilter} onChange={(event) => setPaymentStatusFilter(event.target.value as "all" | "pending" | "succeeded" | "failed" | "refunded" | "canceled")}>
                  <option value="all">Status: all</option>
                  <option value="succeeded">succeeded</option>
                  <option value="pending">pending</option>
                  <option value="failed">failed</option>
                  <option value="refunded">refunded</option>
                  <option value="canceled">canceled</option>
                </select>
                <button className="inline-flex h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm" onClick={loadPayments}>
                  <RefreshCcw className="h-4 w-4" /> Apply
                </button>
              </div>

              <div className="mt-3 overflow-x-auto rounded-2xl border border-border/70">
                <table className="w-full min-w-[1120px] text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-foreground/65">
                    <tr>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">User</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Provider</th>
                      <th className="px-4 py-3 text-left">Invoice ID</th>
                      <th className="px-4 py-3 text-left">Reference</th>
                      <th className="px-4 py-3 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length ? (
                      payments.map((payment) => (
                        <tr key={payment._id} className="border-t border-border/70">
                          <td className="px-4 py-3 text-xs">{new Date(payment.paidAt || payment.createdAt || Date.now()).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold">{payment.user.name}</p>
                            <p className="text-xs text-foreground/65">{payment.user.email}</p>
                          </td>
                          <td className="px-4 py-3">{payment.type}</td>
                          <td className="px-4 py-3 font-semibold">{formatMoney(payment.amount, payment.currency)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${paymentStatusPill(payment.status)}`}>{payment.status}</span>
                          </td>
                          <td className="px-4 py-3">{payment.provider}</td>
                          <td className="px-4 py-3 text-xs text-foreground/70">{payment.invoiceId || "-"}</td>
                          <td className="px-4 py-3 text-xs text-foreground/70">{payment.referenceId}</td>
                          <td className="px-4 py-3">
                            <button className="inline-flex items-center gap-1 rounded-lg border border-primary/45 bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20" onClick={() => setSelectedPayment(payment)}>
                              <Eye className="h-3.5 w-3.5" /> View details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td className="px-4 py-8 text-foreground/70" colSpan={9}>No payment records found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </section>
        )
      ) : null}

      {selectedPayment ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-semibold">Payment detail</p>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
                onClick={() => setSelectedPayment(null)}
                aria-label="Close payment detail modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-foreground/60">User:</span> {selectedPayment.user.name}</p>
              <p><span className="text-foreground/60">Email:</span> {selectedPayment.user.email}</p>
              <p><span className="text-foreground/60">Amount:</span> {formatMoney(selectedPayment.amount, selectedPayment.currency)}</p>
              <p>
                <span className="text-foreground/60">Status:</span>{" "}
                <span className={`ml-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${paymentStatusPill(selectedPayment.status)}`}>
                  {selectedPayment.status}
                </span>
              </p>
              <p><span className="text-foreground/60">Type:</span> {selectedPayment.type}</p>
              <p><span className="text-foreground/60">Provider:</span> {selectedPayment.provider}</p>
              <p><span className="text-foreground/60">Plan:</span> {selectedPayment.subscriptionPlan || "-"}</p>
              <p><span className="text-foreground/60">Coins Added:</span> {selectedPayment.coinsAdded || 0}</p>
              <p className="sm:col-span-2"><span className="text-foreground/60">Invoice ID:</span> {selectedPayment.invoiceId || "-"}</p>
              <p className="sm:col-span-2"><span className="text-foreground/60">Reference:</span> {selectedPayment.referenceId}</p>
              <p className="sm:col-span-2"><span className="text-foreground/60">Checkout Session:</span> {selectedPayment.stripeCheckoutSessionId || "-"}</p>
              <p className="sm:col-span-2"><span className="text-foreground/60">Payment Intent:</span> {selectedPayment.stripePaymentIntentId || "-"}</p>
              <p className="sm:col-span-2"><span className="text-foreground/60">Invoice:</span> {selectedPayment.stripeInvoiceId || "-"}</p>
              <p className="sm:col-span-2"><span className="text-foreground/60">Subscription:</span> {selectedPayment.stripeSubscriptionId || "-"}</p>
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Metadata</p>
              <pre className="mt-2 max-h-52 overflow-auto rounded-xl border border-border bg-muted/30 p-3 text-xs">{JSON.stringify(selectedPayment.metadata || {}, null, 2)}</pre>
            </div>
          </div>
        </div>
      ) : null}

      {selectedUserDetail ? (
        <div className="fixed inset-0 z-[123] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-semibold">User details</p>
              <button
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
                onClick={() => setSelectedUserDetail(null)}
                aria-label="Close user detail modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-foreground/60">Name:</span> {selectedUserDetail.name}</p>
              <p><span className="text-foreground/60">Email:</span> {selectedUserDetail.email}</p>
              <p><span className="text-foreground/60">Role:</span> {selectedUserDetail.role}</p>
              <p><span className="text-foreground/60">Account:</span> {selectedUserDetail.accountStatus}</p>
              <p><span className="text-foreground/60">Verified:</span> {selectedUserDetail.isVerified ? "Yes" : "No"}</p>
              <p><span className="text-foreground/60">Plan:</span> {selectedUserDetail.subscriptionPlan || "free"}</p>
              <p><span className="text-foreground/60">Subscription status:</span> {selectedUserDetail.subscription?.status || "none"}</p>
              <p><span className="text-foreground/60">Provider:</span> {selectedUserDetail.subscription?.provider || "-"}</p>
              <p><span className="text-foreground/60">Monthly amount:</span> {formatMoney(Number(selectedUserDetail.subscription?.monthlyAmount || 0), (selectedUserDetail.subscription?.currency || "USD").toUpperCase())}</p>
              <p><span className="text-foreground/60">Period start:</span> {selectedUserDetail.subscription?.currentPeriodStart ? new Date(selectedUserDetail.subscription.currentPeriodStart).toLocaleString() : "-"}</p>
              <p><span className="text-foreground/60">Period end:</span> {selectedUserDetail.subscription?.currentPeriodEnd ? new Date(selectedUserDetail.subscription.currentPeriodEnd).toLocaleString() : "-"}</p>
              <p><span className="text-foreground/60">Created:</span> {selectedUserDetail.createdAt ? new Date(selectedUserDetail.createdAt).toLocaleString() : "-"}</p>
              <p><span className="text-foreground/60">Deleted:</span> {selectedUserDetail.deletedAt ? new Date(selectedUserDetail.deletedAt).toLocaleString() : "-"}</p>
              <p className="sm:col-span-2"><span className="text-foreground/60">User ID:</span> {selectedUserDetail._id}</p>
            </div>
          </div>
        </div>
      ) : null}

      {deleteCandidate ? (
        <div className="fixed inset-0 z-[125] grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <p className="text-lg font-semibold">Delete User Permanently?</p>
            <p className="mt-2 text-sm text-foreground/70">
              This will permanently remove <span className="font-semibold">{deleteCandidate.name}</span> ({deleteCandidate.email}) and related records from database.
            </p>
            <p className="mt-1 text-xs text-rose-500">This action cannot be undone.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="inline-flex h-10 items-center rounded-xl border border-border px-3 text-sm"
                onClick={() => setDeleteCandidate(null)}
              >
                Cancel
              </button>
              <button
                className="inline-flex h-10 items-center rounded-xl border border-rose-600/45 bg-rose-600/20 px-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-600/30 dark:text-rose-200"
                onClick={async () => {
                  const id = deleteCandidate._id;
                  setDeleteCandidate(null);
                  await deleteUser(id);
                }}
              >
                Yes, Delete Permanently
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <Toast open={Boolean(message.trim())} message={message} />
    </main>
  );
}
