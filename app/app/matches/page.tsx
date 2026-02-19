"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCard } from "@/components/profile/profile-card";

type MatchUser = {
  _id: string;
  name: string;
  age?: number;
  photos?: string[];
  interests?: string[];
  location?: { city?: string };
  isOnline?: boolean;
};
type MatchItem = { _id: string; user1: MatchUser; user2: MatchUser };

type Me = { userId: string };

function MatchesSkeleton() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-10 w-52 rounded-xl" />
      <Skeleton className="h-6 w-64 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, idx) => (
          <div key={idx} className="overflow-hidden rounded-3xl border border-border/80 bg-card">
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

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const meRes = await apiFetch("/api/auth/me", { retryOn401: true });
      const meJson = await meRes.json();
      if (meRes.ok) setMe(meJson.data);

      const res = await apiFetch("/api/matches", { retryOn401: true });
      const json = await res.json();
      if (res.ok) setMatches(json.data || []);
      setLoading(false);
    })();
  }, []);

  const cards = useMemo<MatchUser[]>(() => {
    if (!me) return [];
    return matches.flatMap((match) => {
      const other = String(match.user1?._id) === me.userId ? match.user2 : match.user1;
      return other?._id ? [other] : [];
    });
  }, [matches, me]);

  if (loading) return <MatchesSkeleton />;

  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-semibold">Matches</h1>
      <p className="mt-1 text-sm text-foreground/70">People who liked you back.</p>
      {cards.length ? (
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <ProfileCard key={card._id} profile={card} liked showActions />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-lg font-semibold">No matches yet</p>
          <p className="mt-1 text-sm text-foreground/65">Keep swiping and start new chats when someone likes you back.</p>
          <Link href="/app/discover" className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
            Open discover
          </Link>
        </div>
      )}
    </main>
  );
}
