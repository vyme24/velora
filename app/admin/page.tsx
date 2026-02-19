"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Sparkles, UserPlus, RefreshCcw, Search } from "lucide-react";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import { BadgePremium } from "@/components/ui/badge-premium";
import { Toast } from "@/components/ui/toast";
import { GlassCard } from "@/components/ui/glass-card";

type UserRole = "user" | "admin" | "super_admin";
type AccountStatus = "active" | "deactivated" | "disabled";
type PricingKind = "coin" | "subscription";
type SubscriptionKey = "gold" | "platinum";

type AdminUser = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus: AccountStatus;
  isVerified: boolean;
  createdAt?: string;
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

const roleOptions: UserRole[] = ["user", "admin", "super_admin"];
const statusOptions: AccountStatus[] = ["active", "deactivated", "disabled"];

function rolePill(role: UserRole) {
  if (role === "super_admin") return "border-primary/40 bg-primary/10 text-primary";
  if (role === "admin") return "border-sky-400/40 bg-sky-500/10 text-sky-300";
  return "border-slate-400/40 bg-slate-500/10 text-slate-300";
}

function statusPill(status: AccountStatus) {
  if (status === "active") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-300";
  if (status === "disabled") return "border-primary/40 bg-primary/10 text-primary/80";
  return "border-primary/40 bg-primary/10 text-primary/80";
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [actorRole, setActorRole] = useState<UserRole>("admin");
  const [loading, setLoading] = useState(true);
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
  const [pricingOpen, setPricingOpen] = useState(false);
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
    setLoading(true);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setUsers(json.data.users);
      setActorRole(json.data.actorRole);
    } else {
      setMessage(json.message || "Failed to load users");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
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
  }

  async function updateUser(id: string, patch: Partial<Pick<AdminUser, "role" | "accountStatus" | "isVerified" | "name">>) {
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
    await loadPricingPlans();
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

  const stats = useMemo(() => {
    const active = users.filter((user) => user.accountStatus === "active").length;
    const admins = users.filter((user) => user.role === "admin" || user.role === "super_admin").length;
    const disabled = users.filter((user) => user.accountStatus === "disabled").length;
    return { total: users.length, active, admins, disabled };
  }, [users]);

  return (
    <main className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-velora-gradient p-6 text-white shadow-[0_0_25px_rgba(83,58,253,0.40)]">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/80">Control Center</p>
            <h1 className="mt-2 text-3xl font-semibold">Admin User Management</h1>
            <p className="mt-2 text-sm text-white/85">Create, edit, deactivate, disable, and delete users with role-safe permissions.</p>
          </div>
          <div className="flex items-center gap-2">
            <BadgePremium />
            <span className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs">{actorRole}</span>
            <button
              onClick={async () => {
                setPricingOpen(true);
                await loadPricingPlans();
              }}
              className="rounded-full border border-white/35 bg-white/10 px-3 py-1 text-xs hover:bg-white/15"
            >
              Pricing modal
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-foreground/65">Total users</p>
          <p className="mt-2 text-3xl font-semibold">{stats.total}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-foreground/65">Active users</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-400">{stats.active}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-foreground/65">Admins</p>
          <p className="mt-2 text-3xl font-semibold text-sky-400">{stats.admins}</p>
        </GlassCard>
        <GlassCard>
          <p className="text-xs uppercase tracking-wider text-foreground/65">Disabled</p>
          <p className="mt-2 text-3xl font-semibold text-primary/80">{stats.disabled}</p>
        </GlassCard>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_2fr]">
        <GlassCard>
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-semibold">Add New User</h2>
          </div>
          <div className="mt-4 space-y-3">
            <Input placeholder="Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <Input placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            <Input placeholder="Password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
            <select
              className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm"
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as UserRole }))}
              disabled={!canManageRoles}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <GradientButton className="w-full justify-center" onClick={createUser} disabled={!canManageRoles}>
              {canManageRoles ? "Create user" : "Super admin required"}
            </GradientButton>
          </div>
        </GlassCard>

        <GlassCard className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              <Input className="pl-9" placeholder="Search by name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <select className="h-11 rounded-2xl border border-border bg-background px-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as "all" | UserRole)}>
              <option value="all">All roles</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
            <select className="h-11 rounded-2xl border border-border bg-background px-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | AccountStatus)}>
              <option value="all">All status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <button className="inline-flex h-11 items-center gap-2 rounded-2xl border border-border px-3 text-sm" onClick={loadUsers}>
              <RefreshCcw className="h-4 w-4" /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card/80">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-foreground/65">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Verified</th>
                  <th className="px-4 py-3 text-left">Quick actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-8 text-foreground/70" colSpan={5}>Loading users...</td>
                  </tr>
                ) : filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="border-t border-border/70 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold">{user.name}</p>
                        <p className="text-xs text-foreground/70">{user.email}</p>
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-[10px] uppercase tracking-wider text-primary">
                          <Sparkles className="h-3 w-3" /> Member
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`mb-2 inline-flex rounded-full border px-2 py-1 text-xs ${rolePill(user.role)}`}>{user.role}</span>
                        <select
                          className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-xs"
                          value={user.role}
                          onChange={(event) => updateUser(user._id, { role: event.target.value as UserRole })}
                          disabled={!canManageRoles}
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>{role}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`mb-2 inline-flex rounded-full border px-2 py-1 text-xs ${statusPill(user.accountStatus)}`}>{user.accountStatus}</span>
                        <select
                          className="mt-1 h-9 w-full rounded-xl border border-border bg-background px-2 text-xs"
                          value={user.accountStatus}
                          onChange={(event) => updateUser(user._id, { accountStatus: event.target.value as AccountStatus })}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs ${user.isVerified ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-primary/40 bg-primary/10 text-primary/80"}`}
                          onClick={() => updateUser(user._id, { isVerified: !user.isVerified })}
                        >
                          <Shield className="h-3 w-3" /> {user.isVerified ? "Verified" : "Unverified"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button className="rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs text-primary/80" onClick={() => updateUser(user._id, { accountStatus: "deactivated" })}>Deactivate</button>
                          <button className="rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs text-primary/80" onClick={() => updateUser(user._id, { accountStatus: "disabled" })}>Disable</button>
                          <button className="rounded-xl border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs text-primary" onClick={() => updateUser(user._id, { accountStatus: "active" })}>Activate</button>
                          <button
                            className="rounded-xl border border-primary/70 bg-transparent px-2.5 py-1.5 text-xs text-primary/80 disabled:cursor-not-allowed disabled:opacity-45"
                            onClick={() => deleteUser(user._id)}
                            disabled={!canManageRoles}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-4 py-8 text-foreground/70" colSpan={5}>No users match your filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>

      <Toast open={Boolean(message.trim())} message={message} />

      {pricingOpen ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-5xl rounded-3xl border border-border bg-card p-4 shadow-2xl md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold">Manage Pricing Plans</p>
                <p className="text-xs text-foreground/65">Dynamic package/plan database with live modal usage.</p>
              </div>
              <button onClick={() => setPricingOpen(false)} className="rounded-xl border border-border px-3 py-2 text-sm">
                Close
              </button>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1.1fr_1.9fr]">
              <div className="space-y-2 rounded-2xl border border-border p-3">
                <p className="text-sm font-semibold">Add New Plan</p>
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
                <button
                  onClick={createPricingPlan}
                  className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-white disabled:opacity-60"
                  disabled={!canManageRoles}
                >
                  {canManageRoles ? "Create plan" : "Super admin required"}
                </button>
              </div>

              <div className="rounded-2xl border border-border p-3">
                <p className="mb-2 text-sm font-semibold">Plans in Database</p>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {pricingLoading ? (
                    <p className="text-sm text-foreground/70">Loading plans...</p>
                  ) : pricingPlans.length ? (
                    pricingPlans.map((plan) => (
                      <div key={plan._id} className="rounded-xl border border-border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">{plan.label} <span className="text-xs text-foreground/60">({plan.key})</span></p>
                            <p className="text-xs text-foreground/65">
                              {plan.kind} • ${(plan.amount / 100).toFixed(2)}
                              {plan.kind === "coin" ? ` • ${plan.coins || 0} coins` : ` • ${plan.subscriptionKey || "n/a"}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => patchPricingPlan(plan._id, { active: !plan.active })}
                              className={`rounded-lg border px-2.5 py-1 text-xs ${plan.active ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" : "border-border"}`}
                              disabled={!canManageRoles}
                            >
                              {plan.active ? "Active" : "Inactive"}
                            </button>
                            <button
                              onClick={() => removePricingPlan(plan._id)}
                              className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                              disabled={!canManageRoles}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-foreground/70">No plans found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
