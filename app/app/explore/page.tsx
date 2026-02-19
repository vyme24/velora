"use client";

import Link from "next/link";
import { Compass } from "lucide-react";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { buildExploreCategories, type ExploreCategory, type ExploreUser } from "@/lib/explore";
import { Skeleton } from "@/components/ui/skeleton";

function CategoriesSkeleton() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-28 rounded-3xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, idx) => (
          <Skeleton key={idx} className="h-[320px] rounded-3xl" />
        ))}
      </div>
    </main>
  );
}

export default function ExploreCategoriesPage() {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExploreCategory[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await apiFetch("/api/discover", { retryOn401: true });
      const json = await res.json();
      const profiles: ExploreUser[] = res.ok ? json.data || [] : [];
      setCategories(buildExploreCategories(profiles));
      setLoading(false);
    })();
  }, []);

  if (loading) return <CategoriesSkeleton />;

  return (
    <main className="space-y-4">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <p className="inline-flex items-center gap-2 text-2xl font-semibold">
          <Compass className="h-6 w-6 text-primary" /> Explore Categories
        </p>
        <p className="mt-1 text-sm text-foreground/70">Loaded from real user profile interests and live discover data.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map((category) => {
          return (
            <Link
              key={category.id}
              href={`/app/explore/${category.id}`}
              className={`group relative overflow-hidden rounded-3xl bg-gradient-to-b p-4 text-left text-white shadow-lg transition hover:-translate-y-1 hover:shadow-2xl ${category.tone}`}
            >
              <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/20 blur-xl transition group-hover:scale-110" />
              <div className="absolute -left-8 bottom-6 h-24 w-24 rounded-full bg-white/15 blur-xl" />

              <div className="relative flex h-[320px] flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white ${category.bubble}`}>
                    <span className="h-4 w-4 rounded-full border border-white/60 bg-white/30" />
                    {category.stat}
                  </div>
                  <span className="rounded-full border border-white/40 bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
                    {category.type === "interest" ? "Interest" : "Category"}
                  </span>
                </div>

                <div>
                  <p className="text-[42px] font-extrabold leading-[0.95] tracking-tight">
                    {category.title}
                  </p>
                  <p className="mt-2 text-sm font-medium text-white/85">{category.subtitle}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-white/80">Open category</p>
                </div>
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
