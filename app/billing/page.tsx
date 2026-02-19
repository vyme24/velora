"use client";

import Link from "next/link";

export default function BillingPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6">
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="mt-2 text-sm text-foreground/75">
          Manage coins and subscriptions from Settings.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/app/settings" className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white">
            Open Settings
          </Link>
          <Link href="/upgrade" className="inline-flex h-10 items-center rounded-2xl border border-border px-4 text-sm font-semibold">
            Buy Coins
          </Link>
        </div>
      </div>
    </main>
  );
}
