"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client-api";
import { VeloraLogo } from "@/components/brand/velora-logo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onLogin() {
    setLoading(true);
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.message || "Login failed");
      setTimeout(() => setMessage(""), 1800);
      return;
    }

    router.push("/app/discover");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <GlassCard className="w-full max-w-md p-6">
        <div className="mb-4"><VeloraLogo href="/" /></div>
        <h1 className="text-3xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-foreground/70">Login to continue your matches.</p>
        <div className="mt-5 space-y-3">
          <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <Input placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <GradientButton className="w-full justify-center" onClick={onLogin} disabled={loading}>{loading ? "Signing in..." : "Login"}</GradientButton>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="h-10 rounded-2xl border border-border text-sm"
            onClick={() => {
              window.location.href = "/api/auth/google/start";
            }}
          >
            Google
          </button>
          <button className="h-10 rounded-2xl border border-border text-sm">Apple</button>
        </div>
        <p className="mt-4 text-sm text-foreground/75">No account? <Link href="/register" className="font-semibold text-primary">Sign up</Link></p>
      </GlassCard>
      <Toast open={Boolean(message)} message={message} />
    </main>
  );
}
