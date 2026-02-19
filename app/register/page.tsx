"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { GradientButton } from "@/components/ui/gradient-button";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { AvatarUploader } from "@/components/premium/avatar-uploader";
import { Toast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/client-api";
import { VeloraLogo } from "@/components/brand/velora-logo";

const steps = ["Basic", "Preferences", "Photos"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState("other");
  const [lookingFor, setLookingFor] = useState("all");
  const [age, setAge] = useState(18);

  const [userId, setUserId] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");

  async function onRegister() {
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
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    if (json.data?.autoLoggedIn) {
      setMessage("Account created. Redirecting...");
      setTimeout(() => {
        setMessage("");
        router.push("/app/discover");
        router.refresh();
      }, 500);
      return;
    }

    setUserId(json.data.userId);
    setDevOtp(json.data.devOtp || "");
    setMessage("Account created. Verify OTP to continue.");
    setTimeout(() => setMessage(""), 2000);
  }

  async function onVerify() {
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
      setTimeout(() => setMessage(""), 2000);
      return;
    }

    setMessage("Verified. Please log in.");
    setTimeout(() => {
      setMessage("");
      router.push("/login");
    }, 900);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <GlassCard className="w-full max-w-xl p-6">
        <div className="mb-4"><VeloraLogo href="/" /></div>
        <h1 className="text-3xl font-semibold">Create your account</h1>
        <button
          className="mt-4 h-10 w-full rounded-2xl border border-border text-sm font-semibold"
          onClick={() => {
            window.location.href = "/api/auth/google/start";
          }}
        >
          Continue with Google
        </button>
        <div className="mt-4 h-2 rounded-full bg-muted">
          <div className="h-2 rounded-full bg-velora-gradient transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
        <p className="mt-2 text-xs uppercase tracking-widest text-foreground/70">Step {step + 1}: {steps[step]}</p>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="mt-5 space-y-3">
            {step === 0 ? (
              <>
                <Input placeholder="Full Name" value={name} onChange={(event) => setName(event.target.value)} />
                <Input placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <Input placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </>
            ) : null}
            {step === 1 ? (
              <>
                <Input placeholder="Gender" value={gender} onChange={(event) => setGender(event.target.value)} />
                <Input placeholder="Looking for" value={lookingFor} onChange={(event) => setLookingFor(event.target.value)} />
                <Input placeholder="Age" type="number" value={age} onChange={(event) => setAge(Number(event.target.value || 18))} />
              </>
            ) : null}
            {step === 2 ? (
              <>
                <AvatarUploader />
                <AvatarUploader />
                {!userId ? (
                  <GradientButton className="w-full justify-center" onClick={onRegister} disabled={loading}>{loading ? "Creating..." : "Finish signup"}</GradientButton>
                ) : (
                  <div className="space-y-2 rounded-2xl border border-border p-3">
                    <Input placeholder="Enter OTP" value={otp} onChange={(event) => setOtp(event.target.value)} />
                    {devOtp ? <p className="text-xs text-foreground/70">Dev OTP: <span className="font-semibold">{devOtp}</span></p> : null}
                    <GradientButton className="w-full justify-center" onClick={onVerify} disabled={loading}>{loading ? "Verifying..." : "Verify OTP"}</GradientButton>
                  </div>
                )}
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-6 flex items-center justify-between">
          <button className="h-10 rounded-2xl border border-border px-4 text-sm" disabled={step === 0} onClick={() => setStep((v) => Math.max(0, v - 1))}>Back</button>
          {step < steps.length - 1 ? (
            <GradientButton onClick={() => setStep((v) => Math.min(steps.length - 1, v + 1))}>Next</GradientButton>
          ) : null}
        </div>
      </GlassCard>
      <Toast open={Boolean(message)} message={message} />
    </main>
  );
}
