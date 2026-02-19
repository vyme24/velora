"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Bell, ChevronDown, Coins, Home, LogOut, Settings, Users } from "lucide-react";
import { VeloraLogo } from "@/components/brand/velora-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const sideLinks = [
  { href: "/admin", tab: "overview", label: "Dashboard", icon: BarChart3 },
  { href: "/admin/users", tab: "users", label: "Users", icon: Users },
  { href: "/admin/pricing", tab: "pricing", label: "Pricing", icon: Settings },
  { href: "/admin/settings", tab: "settings", label: "Coin Rules", icon: Coins },
  { href: "/admin/payments", tab: "payments", label: "Payments", icon: Coins }
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab =
    pathname === "/admin"
      ? "overview"
      : pathname === "/admin/users"
        ? "users"
        : pathname === "/admin/pricing"
          ? "pricing"
          : pathname === "/admin/settings"
            ? "settings"
            : pathname === "/admin/payments"
              ? "payments"
              : (searchParams.get("tab") || "overview");
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");
  const [adminRole, setAdminRole] = useState("admin");
  const [avatar, setAvatar] = useState("");
  const [notifItems, setNotifItems] = useState<string[]>([]);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-[1500px] gap-8 px-3 py-4 md:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col border-r border-border pr-4 lg:flex">
          <div className="py-2">
            <VeloraLogo href="/admin" />
            <p className="mt-1 text-xs text-foreground/65">Admin control panel</p>
          </div>

          <nav className="mt-4 space-y-1.5">
            {sideLinks.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
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
            <p className="px-1 py-2 text-xs text-foreground/65">
              Secure access for `admin` and `super_admin`.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 mb-4 border-b border-border/70 bg-background/90 px-1 py-3 backdrop-blur-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
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
