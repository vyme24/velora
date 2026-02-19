"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BadgePremium } from "@/components/ui/badge-premium";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app/discover", label: "Discover" },
  { href: "/app/matches", label: "Matches" },
  { href: "/app/messages", label: "Messages" },
  { href: "/app/likes", label: "Likes" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/settings", label: "Settings" }
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 border-r border-border bg-card/70 p-5 lg:flex lg:flex-col">
      <p className="text-xl font-semibold">Velora</p>
      <div className="mt-3"><BadgePremium /></div>
      <nav className="mt-8 space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-2xl px-4 py-3 text-sm font-medium transition",
              pathname === item.href ? "bg-velora-gradient text-white" : "hover:bg-muted"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
