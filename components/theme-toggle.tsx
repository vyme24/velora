"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border bg-card transition"
      aria-label="Toggle theme"
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-4 w-4 text-primary" />
        ) : (
          <Moon className="h-4 w-4 text-slate-700" />
        )
      ) : (
        <Moon className="h-4 w-4 text-slate-700" />
      )}
    </button>
  );
}
