"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { VeloraLogo } from "@/components/brand/velora-logo";
import { apiFetch } from "@/lib/client-api";

function isStrongPassword(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[^A-Za-z0-9]/.test(value)
  );
}

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
  }, []);

  const passwordHint = useMemo(
    () => "Use at least 8 chars with uppercase, lowercase, number, and special character.",
    []
  );

  async function onReset() {
    if (!token) {
      setMessage("Reset token is missing.");
      return;
    }
    if (!isStrongPassword(password)) {
      setMessage(passwordHint);
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(json.message || "Unable to reset password.");
      return;
    }

    setDone(true);
    setMessage("Password reset successful. Please log in.");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <GlassCard className="w-full max-w-md p-6">
        <div className="mb-4"><VeloraLogo href="/" /></div>
        <h1 className="text-3xl font-semibold">Reset password</h1>
        <p className="mt-1 text-sm text-foreground/70">{passwordHint}</p>

        <div className="mt-5 space-y-3">
          <Input type="password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <Input type="password" placeholder="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          <GradientButton className="w-full" onClick={onReset} disabled={loading || done}>
            {loading ? "Updating..." : done ? "Updated" : "Update password"}
          </GradientButton>
        </div>

        {done ? (
          <p className="mt-4 text-sm text-emerald-500">
            Password updated. <Link href="/login" className="font-semibold text-primary">Go to login</Link>
          </p>
        ) : null}
      </GlassCard>
      <Toast open={Boolean(message)} message={message} />
    </main>
  );
}

