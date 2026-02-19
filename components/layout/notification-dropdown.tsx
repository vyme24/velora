"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const notifications = [
  "You got a new match with Aria",
  "Mia sent you a message",
  "Your weekly boost is ready"
];

export function NotificationDropdown() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} className="h-10 rounded-2xl border border-border px-3 text-sm">
        Alerts
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute right-0 top-12 w-72 rounded-2xl border border-border bg-card p-3 shadow-xl"
          >
            <ul className="space-y-2 text-sm">
              {notifications.map((n) => (
                <li key={n} className="rounded-xl bg-muted px-3 py-2">
                  {n}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
