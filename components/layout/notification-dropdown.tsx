"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";

type NotificationItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function NotificationDropdown({
  items,
  unreadCount
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm transition hover:border-primary/40"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-border bg-card p-3 shadow-xl"
          >
            <p className="px-1 text-sm font-semibold">Notifications</p>
            <ul className="mt-2 space-y-1 text-sm">
              {items.length ? (
                items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl border border-transparent bg-muted/35 px-3 py-2 transition hover:border-primary/25 hover:bg-muted"
                    >
                      <p className="font-medium">{item.title}</p>
                      {item.subtitle ? <p className="text-xs text-foreground/65">{item.subtitle}</p> : null}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="rounded-xl bg-muted/35 px-3 py-3 text-foreground/65">No new notifications.</li>
              )}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
