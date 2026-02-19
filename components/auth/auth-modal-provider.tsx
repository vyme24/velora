"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";

type AuthMode = "login" | "join";

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Please log in or create an account to continue.");
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState("female");
  const [lookingFor, setLookingFor] = useState("male");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ reason?: string; mode?: AuthMode }>;
      setReason(custom.detail?.reason || "Please log in or create an account to continue.");
      setMode(custom.detail?.mode || "login");
      setOpen(true);
      setMessage("");
    };

    window.addEventListener("velora:auth-required", handler as EventListener);
    return () => window.removeEventListener("velora:auth-required", handler as EventListener);
  }, []);

  useEffect(() => {
    if (searchParams.get("auth") !== "1") return;
    setReason("Please log in or create an account to continue.");
    setMode("login");
    setOpen(true);
    if (pathname === "/") {
      router.replace("/");
    }
  }, [pathname, router, searchParams]);

  async function onLogin() {
    if (!loginEmail || !loginPassword) {
      setMessage("Email and password are required.");
      return;
    }

    setLoading(true);
    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password: loginPassword })
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.message || "Login failed");
      return;
    }

    setOpen(false);
    router.push("/app/discover");
    router.refresh();
  }

  async function onRegister() {
    if (!name || !email || !password) {
      setMessage("Name, email, and password are required.");
      return;
    }

    setLoading(true);
    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        age,
        gender,
        lookingFor,
        acceptedAgePolicy: true
      })
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.message || "Registration failed");
      return;
    }

    if (json.data?.autoLoggedIn) {
      setOpen(false);
      router.push("/app/discover");
      router.refresh();
      return;
    }

    setUserId(json.data?.userId || "");
    setDevOtp(json.data?.devOtp || "");
    setMessage("Account created. Enter OTP to verify.");
  }

  async function onVerifyOtp() {
    if (!userId || !otp) {
      setMessage("OTP is required.");
      return;
    }

    setLoading(true);
    const res = await apiFetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, otp })
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.message || "OTP verification failed");
      return;
    }

    setMode("login");
    setMessage("Email verified. Please login.");
    setUserId("");
    setOtp("");
    setDevOtp("");
  }

  function onGoogleAuth() {
    window.location.href = "/api/auth/google/start";
  }

  function GoogleIcon() {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
        <path
          d="M21.805 10.023h-9.18v3.955h5.266c-.227 1.273-.955 2.352-2.045 3.08v2.56h3.305c1.934-1.781 3.054-4.406 3.054-7.523 0-.693-.062-1.36-.178-2.012z"
          fill="#4285F4"
        />
        <path
          d="M12.625 22c2.767 0 5.087-.916 6.782-2.482l-3.305-2.56c-.916.613-2.087.976-3.477.976-2.67 0-4.933-1.803-5.742-4.23H3.466v2.662A10.24 10.24 0 0012.625 22z"
          fill="#34A853"
        />
        <path
          d="M6.883 13.704a6.154 6.154 0 010-3.908V7.134H3.466a10.24 10.24 0 000 9.23l3.417-2.66z"
          fill="#FBBC05"
        />
        <path
          d="M12.625 6.07c1.505 0 2.857.517 3.92 1.532l2.94-2.94C17.707 2.997 15.387 2 12.625 2a10.24 10.24 0 00-9.159 5.134l3.417 2.662c.809-2.427 3.073-4.226 5.742-4.226z"
          fill="#EA4335"
        />
      </svg>
    );
  }

  return (
    <>
      {children}
      {open ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/45 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
            <div className="grid md:grid-cols-[1fr_1.2fr]">
              <aside className="relative min-h-[560px] bg-gradient-to-br from-primary via-primary/85 to-primary/70 p-7 text-white">
                <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
                <div className="absolute -bottom-20 -left-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
                <div className="flex items-start justify-between gap-3">
                  <div className="relative">
                    <p className="text-3xl font-semibold leading-tight">Welcome to Velora</p>
                    <p className="mt-2 text-sm text-white/90">{reason}</p>
                  </div>
                  <button onClick={() => setOpen(false)} className="rounded-xl border border-white/40 p-2 text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="relative mt-12 space-y-3 text-sm">
                  <p className="rounded-xl border border-white/30 bg-white/10 px-4 py-3">Verified member profiles</p>
                  <p className="rounded-xl border border-white/30 bg-white/10 px-4 py-3">Fast matching and real-time chat</p>
                  <p className="rounded-xl border border-white/30 bg-white/10 px-4 py-3">Secure coins and subscription payments</p>
                </div>
              </aside>

              <section className="min-h-[560px] p-7">
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
                  <button
                    onClick={() => setMode("login")}
                    className={`h-10 rounded-xl text-sm font-semibold ${mode === "login" ? "bg-card shadow-sm" : "text-foreground/70"}`}
                  >
                    Login
                  </button>
                  <button
                    onClick={() => setMode("join")}
                    className={`h-10 rounded-xl text-sm font-semibold ${mode === "join" ? "bg-card shadow-sm" : "text-foreground/70"}`}
                  >
                    Join Now
                  </button>
                </div>

                {mode === "login" ? (
                  <div className="mt-5 space-y-3">
                    <button
                      onClick={onGoogleAuth}
                      type="button"
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background text-sm font-semibold transition hover:border-primary/35 hover:bg-muted/50"
                    >
                      <GoogleIcon />
                      Continue with Google
                    </button>
                    <div className="relative py-1 text-center text-xs text-foreground/60">or sign in with email</div>
                    <input
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      placeholder="Email"
                      className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45"
                    />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      placeholder="Password"
                      className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45"
                    />
                    <button
                      onClick={onLogin}
                      disabled={loading}
                      className="h-12 w-full rounded-2xl bg-velora-gradient text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                    >
                      {loading ? "Signing in..." : "Login"}
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    <button
                      onClick={onGoogleAuth}
                      type="button"
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-border bg-background text-sm font-semibold transition hover:border-primary/35 hover:bg-muted/50"
                    >
                      <GoogleIcon />
                      Join with Google
                    </button>
                    <div className="relative py-1 text-center text-xs text-foreground/60">or create account with email</div>
                    <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45" />
                    <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45" />
                    <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="h-12 w-full rounded-2xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45" />
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" value={age} onChange={(event) => setAge(Number(event.target.value || 18))} placeholder="Age" className="h-12 rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary/45" />
                      <select value={gender} onChange={(event) => setGender(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-2 text-sm outline-none transition focus:border-primary/45">
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                      </select>
                      <select value={lookingFor} onChange={(event) => setLookingFor(event.target.value)} className="h-12 rounded-2xl border border-border bg-background px-2 text-sm outline-none transition focus:border-primary/45">
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="all">All</option>
                      </select>
                    </div>

                    {!userId ? (
                      <button
                        onClick={onRegister}
                        disabled={loading}
                        className="h-12 w-full rounded-2xl bg-velora-gradient text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                      >
                        {loading ? "Creating..." : "Create account"}
                      </button>
                    ) : (
                      <div className="space-y-2 rounded-2xl border border-border p-3">
                        <input value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter OTP" className="h-12 w-full rounded-2xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary/45" />
                        {devOtp ? <p className="text-xs text-foreground/65">Dev OTP: <span className="font-semibold">{devOtp}</span></p> : null}
                        <button
                          onClick={onVerifyOtp}
                          disabled={loading}
                          className="h-12 w-full rounded-2xl bg-velora-gradient text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                        >
                          {loading ? "Verifying..." : "Verify OTP"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {message ? <p className="mt-3 text-xs text-primary">{message}</p> : null}
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
