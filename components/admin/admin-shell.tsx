"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, ChevronDown, Coins, Home, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, Shield, Users, X } from "lucide-react";
import { VeloraLogo } from "@/components/brand/velora-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const sideLinks = [
  { href: "/admin", tab: "overview", label: "Overview", icon: BarChart3, permission: "view_dashboard" },
  { href: "/admin/users", tab: "users", label: "User Management", icon: Users, permission: "manage_users" },
  { href: "/admin/staff", tab: "staff", label: "Staff & Access", icon: Shield, permission: "manage_staff" },
  { href: "/admin/pricing", tab: "pricing", label: "Pricing Plans", icon: Settings, permission: "manage_pricing" },
  { href: "/admin/settings", tab: "settings", label: "System Settings", icon: Coins, permission: "manage_settings" },
  { href: "/admin/email-templates", tab: "email-templates", label: "Email Templates", icon: Bell, permission: "manage_settings" },
  { href: "/admin/payments", tab: "payments", label: "Payment History", icon: Coins, permission: "view_payments" }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const activeTab =
    pathname === "/admin"
      ? "overview"
      : pathname === "/admin/users"
        ? "users"
        : pathname === "/admin/pricing"
          ? "pricing"
          : pathname === "/admin/settings"
            ? "settings"
            : pathname === "/admin/email-templates"
              ? "email-templates"
              : pathname === "/admin/payments"
                ? "payments"
              : pathname === "/admin/staff" || pathname.startsWith("/admin/staff/")
                ? "staff"
                : "overview";
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState("admin");
  const [avatar, setAvatar] = useState("");
  const [notifItems, setNotifItems] = useState<string[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("velora_admin_sidebar_collapsed") : null;
    if (stored === "1") setSidebarCollapsed(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("velora_admin_sidebar_collapsed", sidebarCollapsed ? "1" : "0");
  }, [sidebarCollapsed]);

  useEffect(() => {
    (async () => {
      const [meRes, dashboardRes] = await Promise.all([
        fetch("/api/auth/me", { cache: "no-store" }),
        fetch("/api/admin/dashboard", { cache: "no-store" })
      ]);

      const meJson = await meRes.json();
      const dashJson = await dashboardRes.json();

      if (meRes.ok) {
        setAdminName(meJson.data?.name || "Admin");
        setAdminRole(meJson.data?.role || "admin");
        setAvatar(meJson.data?.photos?.[0] || "");
        setPermissions(meJson.data?.permissions || []);
      }

      if (dashboardRes.ok) {
        const metrics = dashJson.data?.metrics;
        const items = [
          `Users total: ${metrics?.users || 0}`,
          `Matches active: ${metrics?.matches || 0}`,
          `Messages total: ${metrics?.messages || 0}`,
          `Revenue: $${((metrics?.revenueCents || 0) / 100).toFixed(2)}`
        ];
        setNotifItems(items);
      }
    })();
  }, []);

  useEffect(() => {
    function onOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }

    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const hasPermission = (permission: string) => adminRole === "super_admin" || permissions.includes("*") || permissions.includes(permission);
  const visibleLinks = sideLinks.filter((item) => hasPermission(item.permission));

  return (
    <div className="min-h-screen bg-background">
      {mobileSidebarOpen ? (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-4 left-3 z-50 flex w-[280px] flex-col rounded-2xl border border-border bg-card/90 p-3 shadow-2xl backdrop-blur-xl transition-transform lg:hidden",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-[120%]"
        )}
      >
        <div className="flex items-center justify-between">
          <VeloraLogo href="/admin" />
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-foreground/65">Admin control panel</p>
        <nav className="mt-4 space-y-1.5">
          {visibleLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                className={cn(
                  "inline-flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-semibold transition",
                  activeTab === item.tab
                    ? "bg-primary/10 text-foreground"
                    : "text-foreground/75 hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 text-primary" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-2">
          <Link href="/app/discover" className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border text-sm font-semibold hover:bg-muted">
            <Home className="h-4 w-4" />
            Back to app
          </Link>
        </div>
      </aside>

      <div className="mx-auto flex w-full max-w-[1500px] gap-4 px-3 py-4 md:px-6">
        <aside
          className={cn(
            "sticky top-4 hidden h-[calc(100vh-2rem)] shrink-0 flex-col rounded-2xl border border-border bg-card/80 p-3 shadow-xl backdrop-blur-xl transition-all duration-300 lg:flex",
            sidebarCollapsed ? "w-[88px]" : "w-64"
          )}
        >
          <div className="flex items-center justify-between gap-2 py-1">
            <div className={cn("min-w-0", sidebarCollapsed && "sr-only")}>
              <VeloraLogo href="/admin" />
              <p className="mt-1 text-xs text-foreground/65">Admin control panel</p>
            </div>
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>

          <nav className="mt-4 space-y-1.5">
            {visibleLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex w-full items-center rounded-lg px-2 py-2 text-sm font-semibold transition",
                    sidebarCollapsed ? "justify-center" : "gap-2",
                    activeTab === item.tab
                      ? "bg-primary/10 text-foreground"
                      : "text-foreground/75 hover:bg-muted hover:text-foreground"
                  )}
                  title={item.label}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  {!sidebarCollapsed ? item.label : null}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2">
            <Link
              href="/app/discover"
              className={cn(
                "inline-flex h-10 w-full items-center justify-center rounded-lg border border-border text-sm font-semibold hover:bg-muted",
                sidebarCollapsed ? "px-0" : "gap-2"
              )}
              title="Back to app"
            >
              <Home className="h-4 w-4" />
              {!sidebarCollapsed ? "Back to app" : null}
            </Link>
           
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 mb-4 border-b border-border/70 bg-background/90 px-1 py-3 backdrop-blur-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <button
                  onClick={() => setMobileSidebarOpen(true)}
                  className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted lg:hidden"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <p className="text-xs uppercase tracking-[0.2em] text-primary/80">Velora</p>
                <p className="text-lg font-semibold">Admin Dashboard</p>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen((prev) => !prev)}
                    className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border hover:bg-muted"
                    aria-label="Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {notifItems.length ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white">
                        {notifItems.length}
                      </span>
                    ) : null}
                  </button>
                  {notifOpen ? (
                    <div className="absolute right-0 mt-2 w-72 rounded-xl border border-border bg-card p-2 shadow-xl">
                      <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-foreground/60">Notifications</p>
                      <div className="space-y-1">
                        {notifItems.map((item) => (
                          <p key={item} className="rounded-lg px-2 py-2 text-sm hover:bg-muted">{item}</p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <Link
                  href={pathname === "/admin" ? "/app/discover" : "/admin"}
                  className={cn("inline-flex h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted")}
                >
                  {pathname === "/admin" ? "Open app" : "Open admin"}
                </Link>
                <div className="relative" ref={profileRef}>
                  <button
                    onClick={() => setProfileOpen((prev) => !prev)}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-2.5 hover:bg-muted"
                    aria-label="Admin profile menu"
                  >
                    {avatar ? (
                      <Image src={avatar} alt={adminName} width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {adminName.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="hidden text-sm font-semibold md:inline">{adminName}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {profileOpen ? (
                    <div className="absolute right-0 mt-2 w-60 rounded-xl border border-border bg-card p-2 shadow-xl">
                      <div className="border-b border-border px-2 py-2">
                        <p className="text-sm font-semibold">{adminName}</p>
                        <p className="text-xs text-foreground/60">{adminRole}</p>
                      </div>
                      <div className="mt-1 space-y-1">
                        <Link href="/admin" className="block rounded-lg px-2 py-2 text-sm hover:bg-muted" onClick={() => setProfileOpen(false)}>
                          Dashboard
                        </Link>
                        <Link href="/admin/users" className="block rounded-lg px-2 py-2 text-sm hover:bg-muted" onClick={() => setProfileOpen(false)}>
                          Manage users
                        </Link>
                        <Link href="/app/profile" className="block rounded-lg px-2 py-2 text-sm hover:bg-muted" onClick={() => setProfileOpen(false)}>
                          My profile
                        </Link>
                        <button onClick={onLogout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted">
                          <LogOut className="h-4 w-4" /> Logout
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          {children}

          <footer className="mt-8 border-t border-border px-1 py-3 text-xs text-foreground/65">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>Velora Admin Suite</p>
              <p>Users, pricing, coins, moderation, and billing controls.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
