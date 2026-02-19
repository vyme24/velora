"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Flame, MapPin } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { Skeleton } from "@/components/ui/skeleton";
import { interestToSlug, milesFromId, slugToInterestLabel, type ExploreUser } from "@/lib/explore";

const categoryMeta: Record<string, { title: string; subtitle: string }> = {
  all: { title: "All Profiles", subtitle: "Curated for you" },
  online: { title: "Online Now", subtitle: "Ready to chat" },
  nearby: { title: "Nearby", subtitle: "Local connections" },
  private: { title: "Private Photos", subtitle: "Unlock premium" }
};

function scoreFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 3)) % 99;
  return Math.max(72, hash);
}

function ExploreResultSkeleton() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-24 rounded-3xl" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-border/80 bg-card">
            <Skeleton className="aspect-[4/5] w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export default function ExploreCategoryPage() {
  const params = useParams<{ category: string }>();
  const category = String(params?.category || "all");
  const isInterestCategory = category.startsWith("interest-");
  const interestSlug = isInterestCategory ? category.replace(/^interest-/, "") : "";
  const interestLabel = isInterestCategory ? slugToInterestLabel(interestSlug) : "";
  const meta = categoryMeta[category] || (isInterestCategory ? { title: interestLabel, subtitle: "Shared interest" } : undefined);

  const [profiles, setProfiles] = useState<ExploreUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await apiFetch("/api/discover", { retryOn401: true });
      const json = await res.json();
      if (res.ok) setProfiles(json.data || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (category === "online") return profiles.filter((entry) => Boolean(entry.isOnline));
    if (category === "nearby") return profiles.filter((entry) => milesFromId(entry._id) <= 5);
    if (category === "private") return profiles.filter((entry) => Boolean(entry.privatePhotosLocked));
    if (isInterestCategory) {
      return profiles.filter((entry) => (entry.interests || []).some((item) => interestToSlug(item) === interestSlug));
    }
    return profiles;
  }, [profiles, category, isInterestCategory, interestSlug]);

  if (!meta) {
    return (
      <main className="space-y-3">
        <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-lg font-semibold">Category not found</p>
          <Link href="/app/explore" className="mt-3 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
            Back to categories
          </Link>
        </div>
      </main>
    );
  }

  if (loading) return <ExploreResultSkeleton />;

  return (
    <main className="space-y-4">
      <section className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <p className="text-2xl font-semibold">{meta.title}</p>
        <p className="mt-1 text-sm text-foreground/70">{meta.subtitle}</p>
        <Link href="/app/explore" className="mt-3 inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted">
          Back to categories
        </Link>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-lg font-semibold">No profiles in this category</p>
          <p className="mt-1 text-sm text-foreground/65">Try another category.</p>
        </div>
      ) : (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="inline-flex items-center gap-2 text-xl font-semibold">
              <Flame className="h-5 w-5 text-primary" /> {meta.title}
            </p>
            <p className="text-xs text-foreground/65">{filtered.length} results</p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {filtered.map((profile) => (
              <Link
                key={profile._id}
                href={`/app/profile/${profile._id}`}
                className="group overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <div className="relative block aspect-[4/5]">
                  <Image src={profile.photos?.[0] || "/profiles/ava.svg"} alt={profile.name} fill className="object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-1 text-[10px] font-semibold text-white">{scoreFromId(profile._id)}% MATCH</span>
                  {profile.isOnline ? <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white">ONLINE</span> : null}
                  <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                    <p className="text-base font-semibold leading-none">{profile.name} <span className="font-normal text-white/80">{profile.age}</span></p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/85"><MapPin className="h-3.5 w-3.5" /> {profile.location?.city || "Nearby"} • {milesFromId(profile._id)} miles</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
