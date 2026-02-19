import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-border bg-card p-6">
        <p className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
          Payment canceled
        </p>
        <h1 className="mt-3 text-2xl font-semibold">Checkout was canceled</h1>
        <p className="mt-2 text-sm text-foreground/75">
          No charge was made. You can restart checkout anytime.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/upgrade" className="inline-flex h-10 items-center rounded-2xl bg-primary px-4 text-sm font-semibold text-white">
            Try again
          </Link>
          <Link href="/app/settings" className="inline-flex h-10 items-center rounded-2xl border border-border px-4 text-sm font-semibold">
            Open Billing Settings
          </Link>
        </div>
      </div>
    </main>
  );
}
