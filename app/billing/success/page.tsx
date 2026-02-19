import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6">
        <p className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
          Payment successful
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Your payment was completed</h1>
        <p className="mt-2 text-sm text-foreground/75">
          Coins and subscription updates are applied by Stripe webhook. This may take a few seconds.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/app/discover" className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white">
            Go to Discover
          </Link>
          <Link href="/app/settings" className="inline-flex h-10 items-center rounded-2xl border border-border px-4 text-sm font-semibold">
            Open Billing Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
