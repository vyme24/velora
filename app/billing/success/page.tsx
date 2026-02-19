"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch, triggerCoinSync } from "@/lib/client-api";

function BillingSuccessInner() {
  const searchParams = useSearchParams();
  const sessionId = String(searchParams.get("session_id") || "");
  const [message, setMessage] = useState("Verifying payment...");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setMessage("Payment session not found.");
      setDone(true);
      return;
    }

    (async () => {
      const res = await apiFetch("/api/stripe/confirm-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        includeCsrf: true,
        body: JSON.stringify({ sessionId })
      });
      const json = await res.json();

      if (!res.ok) {
        setMessage(json.message || "Unable to confirm payment. Please wait and refresh your account.");
        setDone(true);
        return;
      }

      if (typeof json.data?.coins === "number") {
        triggerCoinSync(json.data.coins);
      }

      if (json.data?.confirmed) {
        if (json.data?.mode === "coins") {
          setMessage(
            json.data?.alreadyApplied
              ? "Coins are already applied to your balance."
              : "Payment confirmed. Coins added to your balance."
          );
        } else {
          setMessage("Payment confirmed. Subscription status updated.");
        }
      } else {
        setMessage("Payment is still processing. It should appear in account shortly.");
      }
      setDone(true);
    })();
  }, [sessionId]);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6">
        <p className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
          Payment successful
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Your payment was completed</h1>
        <p className="mt-2 text-sm text-foreground/75">{message}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/app/discover" className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white">
            Go to Discover
          </Link>
          <Link href="/app/settings" className="inline-flex h-10 items-center rounded-2xl border border-border px-4 text-sm font-semibold">
            Open Account Settings
          </Link>
        </div>
        {!done ? <p className="mt-3 text-xs text-foreground/60">Please wait...</p> : null}
      </div>
    </main>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<main className="mx-auto max-w-2xl px-4 py-10"><div className="h-48 animate-pulse rounded-3xl bg-muted" /></main>}>
      <BillingSuccessInner />
    </Suspense>
  );
}
