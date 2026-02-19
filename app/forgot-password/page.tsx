"use client";

import { useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { VeloraLogo } from "@/components/brand/velora-logo";

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <GlassCard className="w-full max-w-md p-6">
        <div className="mb-4"><VeloraLogo href="/" /></div>
        <h1 className="text-3xl font-semibold">Forgot password</h1>
        <p className="mt-1 text-sm text-foreground/70">We will send a reset link to your email.</p>
        <div className="mt-5 space-y-3">
          <Input placeholder="Email" type="email" />
          <GradientButton className="w-full" onClick={() => setSent(true)}>Send reset link</GradientButton>
        </div>
        {sent ? <p className="mt-3 text-sm text-emerald-400">Reset link sent successfully.</p> : null}
      </GlassCard>
    </main>
  );
}
