import { Skeleton } from "@/components/ui/skeleton";

export function AppShellSkeleton() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-10 w-56 rounded-xl" />
      <Skeleton className="h-24 rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-3xl border border-border bg-card">
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-2/3 rounded-lg" />
              <Skeleton className="h-3 w-1/2 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function AuthFormSkeleton() {
  return (
    <main className="mx-auto grid min-h-[72vh] w-full max-w-md place-items-center px-4 py-10">
      <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm">
        <Skeleton className="h-8 w-32 rounded-xl" />
        <Skeleton className="mt-2 h-4 w-64 rounded-lg" />
        <div className="mt-6 space-y-3">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="mt-5 h-11 w-full rounded-xl" />
      </section>
    </main>
  );
}

export function MessagesLayoutSkeleton() {
  return (
    <main className="grid gap-4 lg:grid-cols-[20rem_1fr_18rem]">
      <Skeleton className="min-h-[68vh] rounded-3xl" />
      <Skeleton className="min-h-[68vh] rounded-3xl" />
      <Skeleton className="min-h-[68vh] rounded-3xl" />
    </main>
  );
}

export function ProfileLayoutSkeleton() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-20 rounded-3xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[540px] rounded-3xl" />
        <Skeleton className="h-[540px] rounded-3xl" />
      </div>
      <Skeleton className="h-40 rounded-3xl" />
    </main>
  );
}

export function BillingSkeleton() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-10 w-60 rounded-xl" />
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="h-72 rounded-3xl" />
    </main>
  );
}

