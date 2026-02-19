"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Compass, MessageCircle, Heart, Coins, Plus, User, Settings, Shield, LogOut, LayoutGrid, ReceiptText } from "lucide-react";
import { useCoinModal } from "@/components/coins/coin-modal-provider";
import { VeloraLogo } from "@/components/brand/velora-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useI18n } from "@/components/i18n-provider";
import { LanguageSelector } from "@/components/language-selector";
import { getAuthMeCached } from "@/lib/client-runtime-cache";

const tabs = [
  { href: "/app/discover", label: "Discover", icon: Compass },
  { href: "/app/explore", label: "Explore", icon: LayoutGrid },
  { href: "/app/likes", label: "Likes", icon: Heart },
  { href: "/app/matches", label: "Matches", icon: User },
  { href: "/app/messages", label: "Messages", icon: MessageCircle }
];

export function TopTabsHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { coins, openCoinModal } = useCoinModal();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [name, setName] = useState("User");
  const [role, setRole] = useState<"user" | "admin" | "super_admin">("user");
  const [avatar, setAvatar] = useState("");
  const [newLikes, setNewLikes] = useState(0);
  const [newMessages] = useState(0);
  const [newMatches, setNewMatches] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadMe() {
      const me = await getAuthMeCached({ ttlMs: 20_000 });
      if (me) {
        setName(me.name || "User");
        setRole(me.role || "user");
        setAvatar(me.photos?.[0] || "");
      }
    }
    void loadMe();
  }, []);

  useEffect(() => {
    if (pathname === "/app/likes") {
      window.localStorage.setItem("velora:likes_seen_at", new Date().toISOString());
      setNewLikes(0);
    }
    if (pathname === "/app/matches") {
      window.localStorage.setItem("velora:matches_seen_at", new Date().toISOString());
      setNewMatches(0);
    }
  }, [pathname]);

  useEffect(() => {
    function onOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  async function onLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto grid max-w-[1400px] grid-cols-[auto_1fr] items-center gap-3 px-3 py-3 md:grid-cols-[auto_1fr_auto] md:gap-4 md:px-6">
        <div className="justify-self-start">
          <VeloraLogo href="/app/discover" compact className="tracking-[-0.02em]" />
        </div>

        <nav className="hidden justify-center md:flex">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border/70 bg-card/90 p-1.5 shadow-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = pathname === tab.href || (tab.href === "/app/explore" && pathname.startsWith("/app/explore/"));
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    active
                    ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-foreground/75 hover:bg-muted"
                  }`}
                >
                  <span className="relative inline-flex">
                    <Icon className="h-4 w-4" />
                    {tab.href === "/app/messages" && newMessages > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {newMessages > 99 ? "99+" : newMessages}
                      </span>
                    ) : null}
                    {tab.href === "/app/likes" && newLikes > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {newLikes > 99 ? "99+" : newLikes}
                      </span>
                    ) : null}
                    {tab.href === "/app/matches" && newMatches > 0 ? (
                      <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                        {newMatches > 99 ? "99+" : newMatches}
                      </span>
                    ) : null}
                  </span>
                  {t(`nav.${tab.label.toLowerCase()}`, tab.label)}
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex items-center justify-end gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/12 to-primary/5 p-1.5 shadow-sm">
            <button
              onClick={() => openCoinModal()}
              className="inline-flex h-8 items-center gap-1 rounded-xl px-1 text-sm font-semibold text-primary"
              aria-label="Open coin packages"
            >
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                <Coins className="h-3.5 w-3.5" />
              </span>
              <span>{coins.toLocaleString()}</span>
            </button>
            <button
              onClick={() => openCoinModal()}
              className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-primary px-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90"
              aria-label={t("coins.add", "Add Coins")}
            >
              <Plus className="h-3.5 w-3.5" />
           
            </button>
          </div>

          <LanguageSelector />
          <ThemeToggle />

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((open) => !open)}
              className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:border-primary/40"
              aria-label="Open profile menu"
            >
              {avatar ? (
                <Image src={avatar} alt={name} width={40} height={40} className="h-10 w-10 object-cover" />
              ) : (
                <span className="inline-flex h-10 w-10 items-center justify-center bg-primary text-xs font-bold text-white">
                  {initials || "U"}
                </span>
              )}
            </button>

            {menuOpen ? (
              <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="border-b border-border/70 bg-muted/40 p-3">
                  <p className="text-sm font-semibold">{name}</p>
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-primary/20 bg-primary/10 px-2.5 py-2 text-primary">
                    <p className="inline-flex items-center gap-1 text-sm font-semibold">
                      <Coins className="h-4 w-4" />
                      {coins.toLocaleString()}
                    </p>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        openCoinModal();
                      }}
                      className="rounded-lg bg-primary px-2 py-1 text-xs font-semibold text-white"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="p-2">
                  <Link
                    href="/app/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-muted"
                  >
                    <User className="h-4 w-4 text-primary" />
                    {t("header.profile", "Profile")}
                  </Link>
                  <Link
                    href="/app/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-muted"
                  >
                    <Settings className="h-4 w-4 text-primary" />
                    {t("header.settings", "Settings")}
                  </Link>
                  <Link
                    href="/app/billing"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-muted"
                  >
                    <ReceiptText className="h-4 w-4 text-primary" />
                    {t("header.billing", "Billing & history")}
                  </Link>
                  {role !== "user" ? (
                    <Link
                      href="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-muted"
                    >
                      <Shield className="h-4 w-4 text-primary" />
                      {t("header.admin", "Admin")}
                    </Link>
                  ) : null}
                  <button
                    onClick={onLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition hover:bg-muted"
                  >
                    <LogOut className="h-4 w-4 text-primary" />
                    {t("header.logout", "Logout")}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-5 gap-1 px-2 pb-2 md:hidden">
        {tabs.map((tab) => {
          const active = pathname === tab.href || (tab.href === "/app/explore" && pathname.startsWith("/app/explore/"));
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs font-semibold ${
                active ? "bg-primary text-primary-foreground" : "text-foreground/70"
              }`}
            >
              <span className="relative inline-flex">
                <Icon className="h-3.5 w-3.5" />
                {tab.href === "/app/messages" && newMessages > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {newMessages > 99 ? "99+" : newMessages}
                  </span>
                ) : null}
                {tab.href === "/app/likes" && newLikes > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {newLikes > 99 ? "99+" : newLikes}
                  </span>
                ) : null}
                {tab.href === "/app/matches" && newMatches > 0 ? (
                  <span className="absolute -right-2 -top-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {newMatches > 99 ? "99+" : newMatches}
                  </span>
                ) : null}
              </span>
              {t(`nav.${tab.label.toLowerCase()}`, tab.label)}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
