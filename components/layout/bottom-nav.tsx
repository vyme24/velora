"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app/discover", label: "Discover" },
  { href: "/app/matches", label: "Matches" },
  { href: "/app/messages", label: "Messages" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/settings", label: "Settings" }
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 p-2 backdrop-blur lg:hidden">
      <div className="grid grid-cols-5 gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "rounded-xl px-2 py-2 text-center text-xs font-semibold",
              pathname === item.href ? "bg-velora-gradient text-white" : "text-foreground/70"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
