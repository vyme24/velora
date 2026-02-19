"use client";

import { useEffect, useState } from "react";
import { VeloraLogo } from "@/components/brand/velora-logo";
import { OpenAuthModalButton } from "@/components/auth/open-auth-modal-button";

export function HomeHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border bg-background/95 text-foreground backdrop-blur"
          : "bg-transparent text-white"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <VeloraLogo light={!scrolled} href="/" />
        <div className="flex items-center gap-2">
          <OpenAuthModalButton
            mode="login"
            label="Login"
            className={`h-10 rounded-2xl px-4 text-sm font-semibold ${
              scrolled ? "border border-border bg-card text-foreground" : "bg-white/10 text-white"
            }`}
          />
          <OpenAuthModalButton
            mode="join"
            label="Join Now"
            className="h-10 rounded-2xl bg-white px-4 text-sm font-semibold text-primary"
          />
        </div>
      </div>
    </header>
  );
}
