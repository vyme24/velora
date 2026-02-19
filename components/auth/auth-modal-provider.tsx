"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { Toast } from "@/components/ui/toast";

type AuthMode = "login" | "join";

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Please log in or create an account to continue.");
  const [mode, setMode] = useState<AuthMode>("login");
  const [forgotMode, setForgotMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginOtpRequired, setLoginOtpRequired] = useState(false);
  const [loginOtpUserId, setLoginOtpUserId] = useState("");
  const [loginOtp, setLoginOtp] = useState("");
  const [loginOtpExpiresAt, setLoginOtpExpiresAt] = useState(0);
  const [loginResendAvailableAt, setLoginResendAvailableAt] = useState(0);
  const [loginResending, setLoginResending] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [lookingFor, setLookingFor] = useState("female");
  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [registerOtpExpiresAt, setRegisterOtpExpiresAt] = useState(0);
  const [registerResendAvailableAt, setRegisterResendAvailableAt] = useState(0);
  const [registerResending, setRegisterResending] = useState(false);
  const [nowTs, setNowTs] = useState(Date.now());

  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ reason?: string; mode?: AuthMode; forgot?: boolean }>;
      setReason(custom.detail?.reason || "Please log in or create an account to continue.");
      setMode(custom.detail?.mode || "login");
      setForgotMode(Boolean(custom.detail?.forgot));
      setOpen(true);
      setMessage("");
    };

    window.addEventListener("velora:auth-required", handler as EventListener);
    return () => window.removeEventListener("velora:auth-required", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!message.trim()) return;
    const timer = setTimeout(() => setMessage(""), 2600);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowTs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") !== "1") return;
    const requestedMode = params.get("auth_mode");
    const requestedForgot = params.get("auth_forgot") === "1";
    const error = params.get("auth_error");
    const errorMessage = (() => {
      if (!error) return "Please log in or create an account to continue.";
      if (error === "google_not_configured") return "Google login is not configured yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.";
      if (error === "google_state_mismatch") return "Google login session expired. Please try again.";
      if (error === "google_token_exchange_failed") return "Google login failed during token exchange. Please try again.";
      if (error === "google_email_missing" || error === "google_email_not_verified") return "Your Google account email is missing or not verified.";
      if (error === "account_not_active") return "Your account is not active.";
      return "Google login failed. Please try again.";
    })();
    setReason(errorMessage);
    setMode(requestedMode === "join" ? "join" : "login");
    setForgotMode(requestedForgot);
    setOpen(true);
    if (pathname === "/") {
      window.history.replaceState(window.history.state, "", "/");
    }
  }, [pathname]);

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

    if (json.data?.otpRequired) {
      setLoginOtpRequired(true);
      setLoginOtpUserId(json.data?.userId || "");
      const expiresSec = Number(json.data?.otpExpiresInSec || 600);
      const cooldownSec = Number(json.data?.resendCooldownSec || 60);
      setLoginOtpExpiresAt(Date.now() + expiresSec * 1000);
      setLoginResendAvailableAt(Date.now() + cooldownSec * 1000);
      setMessage("OTP sent to your email. Enter OTP to continue.");
      return;
    }

    setOpen(false);
    router.push("/app/discover");
    router.refresh();
  }

  async function onForgotPassword() {
    if (!forgotEmail.trim()) {
      setMessage("Please enter your email.");
      return;
    }
    setLoading(true);
    const res = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: forgotEmail.trim() })
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(json.message || "Unable to send reset email.");
      return;
    }
    setMessage("If your account exists, a reset link has been sent.");
    setForgotMode(false);
  }

  async function onVerifyLoginOtp() {
    if (!loginOtpUserId || !loginOtp) {
      setMessage("OTP is required.");
      return;
    }

    setLoading(true);
    const res = await apiFetch("/api/auth/verify-login-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: loginOtpUserId, otp: loginOtp })
    });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(json.message || "OTP verification failed");
      return;
    }

    setOpen(false);
    router.push("/app/discover");
    router.refresh();
  }

  async function onResendLoginOtp() {
    if (!loginOtpUserId) return;
    if (nowTs < loginResendAvailableAt) return;
    setLoginResending(true);
    const res = await apiFetch("/api/auth/resend-login-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: loginOtpUserId })
    });
    const json = await res.json();
    setLoginResending(false);
    if (!res.ok) {
      const retryAfterSec = Number(json?.data?.retryAfterSec || 0);
      if (retryAfterSec > 0) setLoginResendAvailableAt(Date.now() + retryAfterSec * 1000);
      setMessage(json.message || "Unable to resend OTP right now.");
      return;
    }
    const expiresSec = Number(json.data?.otpExpiresInSec || 600);
    const cooldownSec = Number(json.data?.resendCooldownSec || 60);
    setLoginOtpExpiresAt(Date.now() + expiresSec * 1000);
    setLoginResendAvailableAt(Date.now() + cooldownSec * 1000);
    setMessage("OTP resent to your email.");
  }

  async function onRegister() {
    if (!name || !email || !password || !dob) {
      setMessage("Name, email, password, and date of birth are required.");
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
        dob,
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
    const expiresSec = Number(json.data?.otpExpiresInSec || 600);
    const cooldownSec = Number(json.data?.resendCooldownSec || 60);
    setRegisterOtpExpiresAt(Date.now() + expiresSec * 1000);
    setRegisterResendAvailableAt(Date.now() + cooldownSec * 1000);
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
    setRegisterOtpExpiresAt(0);
    setRegisterResendAvailableAt(0);
  }

  async function onResendRegisterOtp() {
    if (!userId) return;
    if (nowTs < registerResendAvailableAt) return;
    setRegisterResending(true);
    const res = await apiFetch("/api/auth/resend-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId })
    });
    const json = await res.json();
    setRegisterResending(false);
    if (!res.ok) {
      const retryAfterSec = Number(json?.data?.retryAfterSec || 0);
      if (retryAfterSec > 0) setRegisterResendAvailableAt(Date.now() + retryAfterSec * 1000);
      setMessage(json.message || "Unable to resend OTP right now.");
      return;
    }
    const expiresSec = Number(json.data?.otpExpiresInSec || 600);
    const cooldownSec = Number(json.data?.resendCooldownSec || 60);
    setRegisterOtpExpiresAt(Date.now() + expiresSec * 1000);
    setRegisterResendAvailableAt(Date.now() + cooldownSec * 1000);
    setMessage("OTP resent to your email.");
  }

  function formatCountdown(ms: number) {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
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
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-2xl md:p-8">
            <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-xl border border-border p-2 text-foreground/80 hover:bg-muted">
              <X className="h-4 w-4" />
            </button>

            <div className="mx-auto">
              <div className="text-center">
                <p className="text-3xl font-semibold leading-tight">Welcome to Velora</p>
                <p className="mx-auto mt-2 max-w-sm text-sm text-foreground/70">{reason}</p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted p-1">
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
                  {loginOtpRequired ? (
                    <>
                      <input
                        value={loginOtp}
                        onChange={(event) => setLoginOtp(event.target.value)}
                        placeholder="Enter login OTP"
                        className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45"
                      />
                      <div className="flex items-center justify-between text-xs text-foreground/65">
                        <span>OTP expires in {formatCountdown(loginOtpExpiresAt - nowTs)}</span>
                        <button
                          onClick={onResendLoginOtp}
                          disabled={loginResending || nowTs < loginResendAvailableAt}
                          className="font-semibold text-primary disabled:cursor-not-allowed disabled:text-foreground/40"
                        >
                          {loginResending
                            ? "Resending..."
                            : nowTs < loginResendAvailableAt
                              ? `Resend in ${formatCountdown(loginResendAvailableAt - nowTs)}`
                              : "Resend OTP"}
                        </button>
                      </div>
                      <button
                        onClick={onVerifyLoginOtp}
                        disabled={loading}
                        className="h-12 w-full rounded-xl bg-velora-gradient text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                      >
                        {loading ? "Verifying..." : "Verify OTP"}
                      </button>
                      <button
                        onClick={() => {
                          setLoginOtpRequired(false);
                          setLoginOtpUserId("");
                          setLoginOtp("");
                        }}
                        className="h-11 w-full rounded-2xl border border-border text-sm"
                      >
                        Back to password login
                      </button>
                    </>
                  ) : (
                    <>
                  {forgotMode ? (
                    <>
                      <input
                        value={forgotEmail}
                        onChange={(event) => setForgotEmail(event.target.value)}
                        placeholder="Enter your email"
                        className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45"
                      />
                      <button
                        onClick={onForgotPassword}
                        disabled={loading}
                        className="h-12 w-full rounded-xl bg-velora-gradient text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                      >
                        {loading ? "Sending..." : "Send reset link"}
                      </button>
                      <button
                        onClick={() => setForgotMode(false)}
                        className="h-11 w-full rounded-2xl border border-border text-sm"
                      >
                        Back to login
                      </button>
                    </>
                  ) : (
                    <>
                  <button
                    onClick={onGoogleAuth}
                    type="button"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold transition hover:border-primary/35 hover:bg-muted/50"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </button>
                  <div className="relative py-1 text-center text-xs text-foreground/60">or sign in with email</div>
                  <input
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    placeholder="Email"
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45"
                  />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    placeholder="Password"
                    className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45"
                  />
                  <div className="flex items-center justify-end">
                    <button onClick={() => setForgotMode(true)} className="text-xs font-semibold text-primary">
                      Forgot password?
                    </button>
                  </div>
                  <button
                    onClick={onLogin}
                    disabled={loading}
                    className="h-12 w-full rounded-2xl bg-velora-gradient text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                  >
                    {loading ? "Signing in..." : "Login"}
                  </button>
                    </>
                  )}
                    </>
                  )}
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
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45" />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45" />
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="h-12 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition focus:border-primary/45" />
                  <p className="text-xs text-foreground/60">Use 8+ chars with uppercase, lowercase, number, and special character.</p>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="space-y-1">
                      <span className="block text-xs font-semibold text-foreground/70">Date of birth</span>
                      <input type="date" value={dob} onChange={(event) => setDob(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none transition focus:border-primary/45" />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-xs font-semibold text-foreground/70">Gender</span>
                      <select value={gender} onChange={(event) => setGender(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-2 text-sm outline-none transition focus:border-primary/45">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="block text-xs font-semibold text-foreground/70">Looking for</span>
                      <select value={lookingFor} onChange={(event) => setLookingFor(event.target.value)} className="h-12 w-full rounded-xl border border-border bg-background px-2 text-sm outline-none transition focus:border-primary/45">
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                        <option value="all">All</option>
                      </select>
                    </label>
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
                      <div className="flex items-center justify-between text-xs text-foreground/65">
                        <span>OTP expires in {formatCountdown(registerOtpExpiresAt - nowTs)}</span>
                        <button
                          onClick={onResendRegisterOtp}
                          disabled={registerResending || nowTs < registerResendAvailableAt}
                          className="font-semibold text-primary disabled:cursor-not-allowed disabled:text-foreground/40"
                        >
                          {registerResending
                            ? "Resending..."
                            : nowTs < registerResendAvailableAt
                              ? `Resend in ${formatCountdown(registerResendAvailableAt - nowTs)}`
                              : "Resend OTP"}
                        </button>
                      </div>
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

              {message ? <p className="mt-3 text-center text-xs text-primary">{message}</p> : null}
            </div>
          </div>
        </div>
      ) : null}
      <Toast open={Boolean(message)} message={message} />
    </>
  );
}
