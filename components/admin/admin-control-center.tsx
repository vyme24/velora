"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Coins,
  DollarSign,
  Heart,
  MessageCircle,
  PlusCircle,
  RefreshCcw,
  Search,
  Shield,
  Sparkles,
  UserPlus,
  Users2
} from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { BadgePremium } from "@/components/ui/badge-premium";
import { Toast } from "@/components/ui/toast";

type UserRole = "user" | "admin" | "super_admin";
type AccountStatus = "active" | "deactivated" | "disabled";
type PricingKind = "coin" | "subscription";
type SubscriptionKey = "gold" | "platinum";
type SubscriptionPlan = "free" | "gold" | "platinum";
type SubscriptionStatus = "none" | "active" | "past_due" | "canceled" | "incomplete" | "incomplete_expired" | "trialing" | "unpaid" | "paused";
export type AdminTab = "overview" | "users" | "pricing" | "settings" | "payments";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  isVerified: boolean;
  subscriptionPlan?: SubscriptionPlan;
  subscription?: {
    status?: SubscriptionStatus;
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
  likes: number;
  matches: number;
  messages: number;
  revenueCents: number;
  payments: number;
};

type RecentPayment = {
  _id: string;
  type: "subscription" | "coin";
  amount: number;
  status: string;
  coinsAdded?: number;
  subscriptionPlan?: string | null;
  paidAt?: string;
  createdAt?: string;
};

const roleOptions: UserRole[] = ["user", "admin", "super_admin"];
const statusOptions: AccountStatus[] = ["active", "deactivated", "disabled"];
const subscriptionPlanOptions: SubscriptionPlan[] = ["free", "gold", "platinum"];
const subscriptionStatusOptions: SubscriptionStatus[] = ["none", "active", "past_due", "canceled", "incomplete", "incomplete_expired", "trialing", "unpaid", "paused"];
const adminTabs: Array<{ id: AdminTab; label: string; href: string }> = [
  { id: "overview", label: "Overview", href: "/admin" },
  { id: "users", label: "Users", href: "/admin/users" },
  { id: "pricing", label: "Pricing", href: "/admin/pricing" },
  { id: "settings", label: "Settings", href: "/admin/settings" },
  { id: "payments", label: "Payments", href: "/admin/payments" }
];

function rolePill(role: UserRole) {
  if (role === "super_admin") return "border-primary/40 bg-primary/10 text-primary";
  if (role === "admin") return "border-sky-400/40 bg-sky-500/10 text-sky-300";
  return "border-slate-400/40 bg-slate-500/10 text-slate-300";
}

function statusPill(status: AccountStatus) {
  if (status === "active") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  if (status === "disabled") return "border-amber-400/40 bg-amber-500/10 text-amber-300";
  return "border-primary/40 bg-primary/10 text-primary/80";
}

function formatMoney(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
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

export function AdminControlCenter({ tab }: { tab: AdminTab }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [actorRole, setActorRole] = useState<UserRole>("admin");
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AccountStatus>("all");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as UserRole
  });

  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingPlans, setPricingPlans] = useState<PricingPlan[]>([]);
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
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);

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
    const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setDashboard(json.data?.metrics || null);
      setRecentPayments(json.data?.recentPayments || []);
    }
  }

  async function loadAppSettings() {
    const res = await fetch("/api/admin/app-settings", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to load app settings");
      return;
    }
    setAppSettings(json.data?.settings || []);
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

  useEffect(() => {
    loadUsers();
    loadDashboard();
    loadAppSettings();
    loadPricingPlans();
  }, []);

  useEffect(() => {
    if (!message.trim()) return;
    const timer = setTimeout(() => setMessage(""), 1800);
    return () => clearTimeout(timer);
  }, [message]);

  async function createUser() {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify(form)
    });

    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Create failed");
      return;
    }

    setMessage("User created");
    setForm({ name: "", email: "", password: "", role: "user" });
    await loadUsers();
    await loadDashboard();
  }

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

  const canManageRoles = actorRole === "super_admin";

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const q = query.trim().toLowerCase();
      const queryMatch = !q || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
      const roleMatch = roleFilter === "all" || user.role === roleFilter;
      const statusMatch = statusFilter === "all" || user.accountStatus === statusFilter;
      return queryMatch && roleMatch && statusMatch;
    });
  }, [users, query, roleFilter, statusFilter]);

  const userStats = useMemo(() => {
    const active = users.filter((user) => user.accountStatus === "active").length;
    const admins = users.filter((user) => user.role === "admin" || user.role === "super_admin").length;
    const disabled = users.filter((user) => user.accountStatus === "disabled").length;
    return { total: users.length, active, admins, disabled };
  }, [users]);

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/15 via-primary/10 to-transparent p-6">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/80">Admin Center</p>
            <h1 className="mt-2 text-3xl font-semibold">Application Management Suite</h1>
            <p className="mt-2 text-sm text-foreground/70">Complete management for users, pricing, coin rules and payment activity.</p>
          </div>
          <div className="flex items-center gap-2">
            <BadgePremium />
            <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{actorRole}</span>
          </div>
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        {adminTabs.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === item.id ? "bg-primary text-white" : "border border-border bg-card hover:bg-muted"}`}
          >
            {item.label}
          </Link>
        ))}
      </section>

      {tab === "overview" ? (
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
        </>
      ) : null}

      {tab === "users" ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_2fr]">
          <article className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="inline-flex items-center gap-2 text-lg font-semibold"><UserPlus className="h-4 w-4 text-primary" />Add New User</p>
            <div className="mt-4 space-y-3">
              <Input placeholder="Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              <Input placeholder="Password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
              <select className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))} disabled={!canManageRoles}>
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <GradientButton className="w-full justify-center" onClick={createUser} disabled={!canManageRoles}>
                {canManageRoles ? "Create user" : "Super admin required"}
              </GradientButton>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                <Input className="pl-9" placeholder="Search users" value={query} onChange={(event) => setQuery(event.target.value)} />
              </div>
              <select className="h-11 rounded-2xl border border-border bg-background px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | UserRole)}>
                <option value="all">All roles</option>
                {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
              </select>
              <select className="h-11 rounded-2xl border border-border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | AccountStatus)}>
                <option value="all">All status</option>
                {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-3 text-sm" onClick={loadUsers}><RefreshCcw className="h-4 w-4" />Refresh</button>
            </div>

            <div className="mt-3 overflow-x-auto rounded-2xl border border-border/70">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wider text-foreground/65">
                  <tr>
                    <th className="px-4 py-3 text-left">User</th>
                    <th className="px-4 py-3 text-left">Role</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Subscription</th>
                    <th className="px-4 py-3 text-left">Verified</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr><td className="px-4 py-8 text-foreground/70" colSpan={6}>Loading users...</td></tr>
                  ) : filteredUsers.length ? (
                    filteredUsers.map((user) => (
                      <tr key={user._id} className="border-t border-border/70 align-top">
                        <td className="px-4 py-3">
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-xs text-foreground/70">{user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`mb-2 inline-flex rounded-full border px-2 py-1 text-xs ${rolePill(user.role)}`}>{user.role}</span>
                          <select className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-xs" value={user.role} onChange={(event) => updateUser(user._id, { role: event.target.value as UserRole })} disabled={!canManageRoles}>
                            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`mb-2 inline-flex rounded-full border px-2 py-1 text-xs ${statusPill(user.accountStatus)}`}>{user.accountStatus}</span>
                          <select className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-xs" value={user.accountStatus} onChange={(event) => updateUser(user._id, { accountStatus: event.target.value as AccountStatus })}>
                            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="h-9 w-full rounded-xl border border-border bg-background px-2 text-xs"
                            value={user.subscriptionPlan || "free"}
                            onChange={(event) => updateUser(user._id, { subscriptionPlan: event.target.value as SubscriptionPlan })}
                          >
                            {subscriptionPlanOptions.map((plan) => <option key={plan} value={plan}>{plan}</option>)}
                          </select>
                          <select
                            className="mt-2 h-9 w-full rounded-xl border border-border bg-background px-2 text-xs"
                            value={user.subscription?.status || "none"}
                            onChange={(event) => updateUser(user._id, { subscriptionStatus: event.target.value as SubscriptionStatus })}
                          >
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
                            <button className="rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs text-primary/80" onClick={() => updateUser(user._id, { accountStatus: "deactivated" })}>Deactivate</button>
                            <button className="rounded-xl border border-amber-400/50 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300" onClick={() => updateUser(user._id, { accountStatus: "disabled" })}>Disable</button>
                            <button className="rounded-xl border border-emerald-400/50 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300" onClick={() => updateUser(user._id, { accountStatus: "active" })}>Activate</button>
                            <button className="rounded-xl border border-rose-400/50 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-300 disabled:opacity-40" onClick={() => deleteUser(user._id)} disabled={!canManageRoles}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td className="px-4 py-8 text-foreground/70" colSpan={6}>No users match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {tab === "pricing" ? (
        <section className="grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
          <article className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="inline-flex items-center gap-2 text-lg font-semibold"><PlusCircle className="h-4 w-4 text-primary" />Add Pricing Plan</p>
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
              <button onClick={createPricingPlan} className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60" disabled={!canManageRoles}>
                {canManageRoles ? "Create plan" : "Super admin required"}
              </button>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-lg font-semibold">Pricing Plans</p>
            <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {pricingLoading ? (
                <p className="text-sm text-foreground/70">Loading plans...</p>
              ) : pricingPlans.length ? (
                pricingPlans.map((plan) => (
                  <div key={plan._id} className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">{plan.label} <span className="text-xs text-foreground/60">({plan.key})</span></p>
                        <p className="text-xs text-foreground/65">
                          {plan.kind} • {formatMoney(plan.amount)} {plan.kind === "coin" ? `• ${plan.coins || 0} coins` : `• ${plan.subscriptionKey || "n/a"}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => patchPricingPlan(plan._id, { active: !plan.active })} className={`rounded-lg border px-2.5 py-1 text-xs ${plan.active ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-border"}`} disabled={!canManageRoles}>{plan.active ? "Active" : "Inactive"}</button>
                        <button onClick={() => removePricingPlan(plan._id)} className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-300" disabled={!canManageRoles}>Delete</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-foreground/70">No plans found.</p>
              )}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="inline-flex items-center gap-2 text-lg font-semibold"><Coins className="h-4 w-4 text-primary" />Coin Rules</p>
            <p className="mt-1 text-sm text-foreground/70">Dynamic cost controls for message and profile unlock flows.</p>
            <div className="mt-3 space-y-2">
              {appSettings.filter((setting) => setting.group === "coins").map((setting) => (
                <div key={setting._id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">{setting.label}</p>
                  <p className="text-xs text-foreground/65">{setting.description || setting.key}</p>
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
                    <span className="text-xs text-foreground/60">coins</span>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="inline-flex items-center gap-2 text-lg font-semibold"><Shield className="h-4 w-4 text-primary" />Integrations</p>
            <p className="mt-1 text-sm text-foreground/70">Manage SMTP and Stripe settings for live operations.</p>
            <div className="mt-3 space-y-2">
              {appSettings.filter((setting) => setting.group === "integrations").map((setting) => (
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
                      type={setting.key.includes("secret") ? "password" : "text"}
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
                    <input
                      type="number"
                      className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                      defaultValue={setting.numberValue ?? 0}
                      onBlur={(event) => {
                        const next = Number(event.target.value || 0);
                        if (!Number.isFinite(next)) return;
                        if (next === (setting.numberValue ?? 0)) return;
                        updateAppSetting(setting, next);
                      }}
                      disabled={!canManageRoles}
                    />
                  )}
                </div>
              ))}
            </div>
          </article>
        </section>
      ) : null}

      {tab === "payments" ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_2fr]">
          <article className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-lg font-semibold">Revenue Snapshot</p>
            <div className="mt-3 space-y-2 rounded-xl border border-border bg-muted/30 p-3 text-sm">
              <p>Total revenue: <span className="font-semibold text-emerald-400">{formatMoney(dashboard?.revenueCents || 0)}</span></p>
              <p>Successful payments: <span className="font-semibold">{dashboard?.payments || 0}</span></p>
              <p>Registered users: <span className="font-semibold">{dashboard?.users || 0}</span></p>
            </div>
          </article>

          <article className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-lg font-semibold">Recent Payments</p>
            <div className="mt-3 space-y-2">
              {recentPayments.length === 0 ? (
                <p className="text-sm text-foreground/70">No succeeded payments found.</p>
              ) : (
                recentPayments.map((payment) => (
                  <div key={payment._id} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                    <div>
                      <p className="font-semibold">
                        {payment.type === "coin"
                          ? `Coin purchase${payment.coinsAdded ? ` (+${payment.coinsAdded})` : ""}`
                          : `Subscription ${payment.subscriptionPlan || ""}`}
                      </p>
                      <p className="text-xs text-foreground/65">{new Date(payment.paidAt || payment.createdAt || Date.now()).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatMoney(payment.amount)}</p>
                      <p className="text-xs text-foreground/65">{payment.status}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      ) : null}

      <Toast open={Boolean(message.trim())} message={message} />
    </main>
  );
}
