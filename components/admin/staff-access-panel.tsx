"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PlusCircle, RefreshCcw, Search, Shield, Trash2, UserPlus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GradientButton } from "@/components/ui/gradient-button";
import { Toast } from "@/components/ui/toast";

type StaffUser = {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "super_admin";
  staffRoleKey?: string | null;
  accountStatus: "active" | "deactivated" | "disabled";
  isVerified: boolean;
  createdAt?: string;
};

type RoleDef = {
  key: string;
  name: string;
  description?: string;
  permissions: string[];
};



export function StaffAccessPanel({ section = "staff" }: { section?: "staff" | "roles" }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [roles, setRoles] = useState<RoleDef[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [query, setQuery] = useState("");
  const [actorRole, setActorRole] = useState<"admin" | "super_admin">("admin");
  const [permissionsCatalog, setPermissionsCatalog] = useState<string[]>([]);
  const [roleDrafts, setRoleDrafts] = useState<Record<string, string[]>>({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin" as "admin" | "super_admin",
    staffRoleKey: "admin_manager"
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

  async function loadData() {
    setLoading(true);
    const res = await fetch("/api/admin/staff", { cache: "no-store" });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to load staff");
      setLoading(false);
      return;
    }
    setStaff(json.data?.staff || []);
    setRoles(json.data?.roles || []);
    setPermissionsCatalog(json.data?.permissionsCatalog || []);
    setActorRole(json.data?.actorRole || "admin");
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!message.trim()) return;
    const timer = setTimeout(() => setMessage(""), 1800);
    return () => clearTimeout(timer);
  }, [message]);

  async function createStaff() {
    setSaving(true);
    const res = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify(form)
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setMessage(json.message || "Failed to create staff");
      return;
    }
    setMessage("Staff account created");
    setShowModal(false);
    setForm({ name: "", email: "", password: "", role: "admin", staffRoleKey: "admin_manager" });
    await loadData();
  }

  async function patchStaff(id: string, patch: Partial<StaffUser>) {
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify(patch)
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Update failed");
      return;
    }
    setMessage("Staff updated");
    await loadData();
  }

  async function removeStaff(id: string) {
    const res = await fetch(`/api/admin/staff/${id}`, {
      method: "DELETE",
      headers: csrfHeaders()
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Delete failed");
      return;
    }
    setMessage("Staff removed");
    await loadData();
  }

  async function saveRolePermissions(roleKey: string) {
    const permissions = roleDrafts[roleKey];
    if (!permissions) return;
    const res = await fetch("/api/admin/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ key: roleKey, permissions })
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json.message || "Failed to update role permissions");
      return;
    }
    setMessage("Role permissions updated");
    setRoleDrafts((prev) => {
      const next = { ...prev };
      delete next[roleKey];
      return next;
    });
    await loadData();
  }

  const visibleStaff = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((entry) => `${entry.name} ${entry.email} ${entry.role} ${entry.staffRoleKey || ""}`.toLowerCase().includes(q));
  }, [staff, query]);

  return (
    <main className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/70 px-4 py-3">
        <div>
          <h1 className="text-2xl font-semibold">Staff & Access</h1>
          <p className="text-sm text-foreground/70">
            {section === "staff"
              ? "Manage admin/staff accounts and operational access."
              : "Manage role permissions and dynamic access control from database."}
          </p>
        </div>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{actorRole}</span>
      </section>

      <section className="inline-flex rounded-2xl border border-border bg-card/70 p-1">
        <Link
          href="/admin/staff"
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${section === "staff" ? "bg-primary text-white" : "hover:bg-muted"}`}
        >
          Staff
        </Link>
        <Link
          href="/admin/staff/roles"
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${section === "roles" ? "bg-primary text-white" : "hover:bg-muted"}`}
        >
          Roles
        </Link>
      </section>

      {section === "staff" ? (
      <section className="rounded-2xl border border-border bg-card/70 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
            <Input className="pl-9" placeholder="Search staff name or email" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm" onClick={loadData}>
            <RefreshCcw className="h-4 w-4" /> Refresh
          </button>
          <GradientButton className="h-10 px-4" onClick={() => setShowModal(true)}>
            <UserPlus className="h-4 w-4" /> Add staff
          </GradientButton>
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-border/70">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-foreground/65">
              <tr>
                <th className="px-4 py-3 text-left">Staff</th>
                <th className="px-4 py-3 text-left">System Role</th>
                <th className="px-4 py-3 text-left">Access Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Verify</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td className="px-4 py-8 text-foreground/70" colSpan={6}>Loading staff...</td></tr>
              ) : visibleStaff.length ? (
                visibleStaff.map((entry) => (
                  <tr key={entry._id} className="border-t border-border/70 align-top">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{entry.name}</p>
                      <p className="text-xs text-foreground/70">{entry.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 w-full rounded-xl border border-border bg-background px-2 text-xs"
                        value={entry.role}
                        onChange={(event) => patchStaff(entry._id, { role: event.target.value as "admin" | "super_admin" })}
                        disabled={actorRole !== "super_admin"}
                      >
                        <option value="admin">admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 w-full rounded-xl border border-border bg-background px-2 text-xs"
                        value={entry.staffRoleKey || "admin_manager"}
                        onChange={(event) => patchStaff(entry._id, { staffRoleKey: event.target.value } as Partial<StaffUser>)}
                        disabled={entry.role === "super_admin"}
                      >
                        {roles.map((role) => (
                          <option key={role.key} value={role.key}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="h-9 w-full rounded-xl border border-border bg-background px-2 text-xs"
                        value={entry.accountStatus}
                        onChange={(event) => patchStaff(entry._id, { accountStatus: event.target.value as StaffUser["accountStatus"] })}
                      >
                        <option value="active">active</option>
                        <option value="deactivated">deactivated</option>
                        <option value="disabled">disabled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="inline-flex items-center gap-2 rounded-xl border border-primary/45 bg-primary/12 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
                        onClick={() => patchStaff(entry._id, { isVerified: !entry.isVerified })}
                      >
                        <Shield className="h-3 w-3" /> {entry.isVerified ? "Verified" : "Unverified"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-600/45 bg-rose-600/15 px-2.5 py-1 text-xs font-semibold text-rose-900 transition hover:bg-rose-600/25 dark:text-rose-200"
                        onClick={() => removeStaff(entry._id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="px-4 py-8 text-foreground/70" colSpan={6}>No staff accounts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {section === "roles" ? (
      <section className="rounded-2xl border border-border bg-card/70 p-4">
        <p className="text-lg font-semibold">Role permissions</p>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <div key={role.key} className="rounded-xl border border-border p-3">
              <p className="font-semibold">{role.name}</p>
              <p className="text-xs text-foreground/65">{role.description || role.key}</p>
              <div className="mt-2 space-y-1">
                {permissionsCatalog.map((perm) => {
                  const current = roleDrafts[role.key] || role.permissions || [];
                  const checked = current.includes(perm);
                  return (
                    <label key={perm} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5"
                        checked={checked}
                        onChange={(event) => {
                          setRoleDrafts((prev) => {
                            const base = prev[role.key] || role.permissions || [];
                            const next = event.target.checked ? [...new Set([...base, perm])] : base.filter((entry) => entry !== perm);
                            return { ...prev, [role.key]: next };
                          });
                        }}
                        disabled={actorRole !== "super_admin"}
                      />
                      {perm}
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  className="rounded-lg border border-border px-2.5 py-1 text-xs disabled:opacity-50"
                  onClick={() =>
                    setRoleDrafts((prev) => {
                      const next = { ...prev };
                      delete next[role.key];
                      return next;
                    })
                  }
                  disabled={!roleDrafts[role.key] || actorRole !== "super_admin"}
                >
                  Reset
                </button>
                <button
                  className="rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs text-primary disabled:opacity-50"
                  onClick={() => saveRolePermissions(role.key)}
                  disabled={!roleDrafts[role.key] || actorRole !== "super_admin"}
                >
                  Save permissions
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
      ) : null}

      {section === "staff" && showModal ? (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="inline-flex items-center gap-2 text-lg font-semibold"><PlusCircle className="h-4 w-4 text-primary" />Add Staff User</p>
              <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <Input placeholder="Full name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
              <Input placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
              <Input placeholder="Password" type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
              <select className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={form.role} onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value as "admin" | "super_admin" }))}>
                <option value="admin">admin</option>
                {actorRole === "super_admin" ? <option value="super_admin">super_admin</option> : null}
              </select>
              {form.role === "admin" ? (
                <select className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm" value={form.staffRoleKey} onChange={(event) => setForm((prev) => ({ ...prev, staffRoleKey: event.target.value }))}>
                  {roles.map((role) => (
                    <option key={role.key} value={role.key}>{role.name}</option>
                  ))}
                </select>
              ) : null}
              <div className="flex justify-end gap-2">
                <button className="h-10 rounded-xl border border-border px-4 text-sm" onClick={() => setShowModal(false)}>Cancel</button>
                <GradientButton className="h-10 px-4" onClick={createStaff} disabled={saving}>
                  {saving ? "Creating..." : "Create staff"}
                </GradientButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <Toast open={Boolean(message.trim())} message={message} />
    </main>
  );
}
