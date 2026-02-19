"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/client-api";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCard } from "@/components/profile/profile-card";

type LikeUser = {
  _id: string;
  name: string;
  age?: number;
  photos?: string[];
  location?: { city?: string };
  isOnline?: boolean;
};

type LikeItem = {
  _id: string;
  createdAt?: string;
  user?: LikeUser | null;
};

function LikesSkeleton() {
  return (
    <main className="space-y-4">
      <Skeleton className="h-10 w-60 rounded-xl" />
      <Skeleton className="h-10 w-64 rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
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

export default function LikesPage() {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sent" | "received">("sent");
  const [sent, setSent] = useState<LikeItem[]>([]);
  const [received, setReceived] = useState<LikeItem[]>([]);

  async function loadLikes() {
    setLoading(true);
    const res = await apiFetch("/api/likes", { retryOn401: true });
    const json = await res.json();
    if (res.ok) {
      setSent(json.data?.sent || []);
      setReceived(json.data?.received || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadLikes();
    window.localStorage.setItem("velora:likes_seen_at", new Date().toISOString());
    window.dispatchEvent(new CustomEvent("velora:badge-sync"));
  }, []);

  const rows = useMemo(() => (tab === "sent" ? sent : received), [tab, sent, received]);

  if (loading) return <LikesSkeleton />;

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-3xl font-semibold">Likes</h1>
        <p className="mt-1 text-sm text-foreground/70">Real-time like activity from your profile interactions.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTab("sent")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "sent" ? "bg-primary text-white" : "border border-border bg-card"}`}
        >
          Liked by you ({sent.length})
        </button>
        <button
          onClick={() => setTab("received")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold ${tab === "received" ? "bg-primary text-white" : "border border-border bg-card"}`}
        >
          Liked you ({received.length})
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-lg font-semibold">{tab === "sent" ? "No likes sent yet" : "No one liked you yet"}</p>
          <p className="mt-1 text-sm text-foreground/65">{tab === "sent" ? "Go to Discover and like profiles." : "Keep your profile active and updated."}</p>
          {tab === "sent" ? (
          <Link href="/app/discover" className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
            Open discover
          </Link>
        ) : null}
      </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {rows.map((entry) => (
            entry.user?._id ? <ProfileCard key={entry._id} profile={entry.user} liked showActions /> : null
          ))}
        </div>
      )}
    </main>
  );
}
