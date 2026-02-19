"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Compass, Flame, Heart, MapPin, RefreshCw, Send, ShieldCheck, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/client-api";
import { Skeleton } from "@/components/ui/skeleton";
import { useCoinModal } from "@/components/coins/coin-modal-provider";

type DiscoverUser = {
  _id: string;
  name: string;
  age: number;
  bio: string;
  photos: string[];
  interests: string[];
  location?: { city?: string };
  isOnline?: boolean;
  privatePhotosLocked?: boolean;
};

function scoreFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 3)) % 99;
  return Math.max(72, hash);
}

function milesFromId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * 13) % 16;
  return Math.max(1, hash);
}

function randomRankFromId(id: string, seed: number) {
  let hash = seed || 1;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 33 + id.charCodeAt(i) * (i + 7)) % 9973;
  return hash;
}

function DiscoverSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <div className="rounded-3xl border border-border/80 bg-card p-4">
          <Skeleton className="h-6 w-24" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <Skeleton className="h-44 rounded-3xl" />
      </aside>

      <section className="space-y-4">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-6 w-44" />
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-3xl border border-border/80 bg-card">
              <Skeleton className="aspect-[4/5] w-full rounded-none" />
              <div className="space-y-2 p-3">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProfileCard({
  profile,
  liked,
  onLike
}: {
  profile: DiscoverUser;
  liked: boolean;
  onLike: (id: string) => void;
}) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900/90">
      <Link href={`/app/profile/${profile._id}`} className="relative block aspect-[4/5]">
        <Image
          src={profile.photos?.[0] || "/profiles/ava.svg"}
          alt={profile.name}
          fill
          className="object-cover transition duration-500 group-hover:scale-105"
        />

        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        <span className="absolute left-2 top-2 rounded-full bg-primary/95 px-2 py-1 text-[10px] font-semibold text-white">
          {scoreFromId(profile._id)}% MATCH
        </span>

        {profile.isOnline ? (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white">
            ONLINE
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-3 text-white">
          <p className="text-base font-semibold leading-none">
            {profile.name} <span className="font-normal text-white/80">{profile.age}</span>
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/85">
            <MapPin className="h-3.5 w-3.5" /> {profile.location?.city || "Nearby"} • {milesFromId(profile._id)} miles
          </p>
        </div>
      </Link>

      <div className="border-t border-border/70 bg-card p-2.5 dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex flex-wrap gap-1">
          {(profile.interests || []).slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground/80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => onLike(profile._id)}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition ${
              liked
                ? "border-primary/45 bg-primary text-white hover:bg-primary/90"
                : "border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white"
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            {liked ? "Liked" : "Like"}
          </button>
          <Link
            href={`/app/messages?user=${profile._id}`}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-background text-xs font-semibold text-primary transition hover:bg-primary hover:text-white dark:bg-slate-800 dark:border-primary/40"
          >
            <Send className="h-3.5 w-3.5" />
            Chat
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function DiscoverPage() {
  const { openCoinModal } = useCoinModal();
  const [profiles, setProfiles] = useState<DiscoverUser[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [city, setCity] = useState("all");
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(60);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [lockedOnly, setLockedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"top" | "nearby" | "newest">("top");

  async function loadProfiles() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/discover");
      const json = await res.json();
      if (res.ok) {
        setProfiles(json.data || []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfiles();
  }, []);

  const cities = useMemo(
    () =>
      Array.from(new Set(profiles.map((profile) => profile.location?.city?.trim()).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b)
      ),
    [profiles]
  );

  const filteredProfiles = useMemo(() => {
    let list = profiles.filter((profile) => {
      const cityMatch = city === "all" || (profile.location?.city || "").toLowerCase() === city.toLowerCase();
      const ageMatch = profile.age >= minAge && profile.age <= maxAge;
      const onlineMatch = !onlineOnly || Boolean(profile.isOnline);
      const lockedMatch = !lockedOnly || Boolean(profile.privatePhotosLocked);
      return cityMatch && ageMatch && onlineMatch && lockedMatch;
    });

    if (sortBy === "top") {
      list = [...list].sort((a, b) => scoreFromId(b._id) - scoreFromId(a._id));
    } else if (sortBy === "nearby") {
      list = [...list].sort((a, b) => milesFromId(a._id) - milesFromId(b._id));
    } else {
      list = [...list].sort((a, b) => String(b._id).localeCompare(String(a._id)));
    }

    if (shuffleSeed > 0) {
      list = [...list].sort((a, b) => randomRankFromId(a._id, shuffleSeed) - randomRankFromId(b._id, shuffleSeed));
    }

    return list;
  }, [profiles, city, minAge, maxAge, onlineOnly, lockedOnly, sortBy, shuffleSeed]);

  const topProfiles = filteredProfiles.length > 4 ? filteredProfiles.slice(0, 4) : filteredProfiles;
  const otherProfiles = filteredProfiles.length > 4 ? filteredProfiles.slice(4) : [];

  async function onLike(receiverId: string) {
    if (liked[receiverId]) return;
    setLiked((prev) => ({ ...prev, [receiverId]: true }));

    const res = await apiFetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ receiverId })
    });

    if (!res.ok) {
      setLiked((prev) => ({ ...prev, [receiverId]: false }));
      return;
    }

    setProfiles((prev) => prev.filter((entry) => String(entry._id) !== String(receiverId)));
  }

  return (
    <main className="space-y-5">
      {loading ? (
        <DiscoverSkeleton />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            <div className="rounded-2xl border border-border/80 bg-card p-4 dark:border-slate-700 dark:bg-slate-900/95">
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold">Filters</p>
                <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">LIVE</span>
              </div>

              <div className="mt-3 space-y-2">
                <select value={city} onChange={(event) => setCity(event.target.value)} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option value="all">All cities</option>
                  {cities.map((entry) => (
                    <option key={entry} value={entry}>
                      {entry}
                    </option>
                  ))}
                </select>

                <select value={sortBy} onChange={(event) => setSortBy(event.target.value as "top" | "nearby" | "newest")} className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <option value="top">Top match</option>
                  <option value="nearby">Nearby first</option>
                  <option value="newest">Newest</option>
                </select>

                <div className="rounded-lg border border-border bg-background px-3 py-2 dark:border-slate-700 dark:bg-slate-800/90">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold text-foreground/75">
                    <span>Age range</span>
                    <span>{minAge} - {maxAge}</span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={99}
                    value={maxAge}
                    onChange={(event) => {
                      setMinAge(18);
                      setMaxAge(Number(event.target.value || 99));
                    }}
                    className="w-full accent-primary"
                  />
                </div>

                <label className="flex h-10 items-center justify-between rounded-lg border border-border px-3 text-sm dark:border-slate-700 dark:bg-slate-800/80">
                  <span>Online only</span>
                  <input type="checkbox" checked={onlineOnly} onChange={(event) => setOnlineOnly(event.target.checked)} className="h-4 w-4 accent-primary" />
                </label>

                <label className="flex h-10 items-center justify-between rounded-lg border border-border px-3 text-sm dark:border-slate-700 dark:bg-slate-800/80">
                  <span>Private photos only</span>
                  <input type="checkbox" checked={lockedOnly} onChange={(event) => setLockedOnly(event.target.checked)} className="h-4 w-4 accent-primary" />
                </label>


                <button
                  onClick={() => {
                    setCity("all");
                    setMinAge(18);
                    setMaxAge(60);
                    setOnlineOnly(false);
                    setLockedOnly(false);
                    setSortBy("top");
                    setShuffleSeed(Date.now());
                  }}
                  className="h-10 w-full rounded-lg border border-border text-sm font-semibold hover:bg-muted dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Reset filters
                </button>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-[#6248ff] to-[#7a5cff] p-5 text-white shadow-lg dark:shadow-primary/20">
              <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_30%_30%,white,transparent_45%)]" />
              <div className="relative">
                <p className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
                  <Sparkles className="h-3 w-3" /> Limited Offer
                </p>
                <p className="mt-3 text-3xl font-black leading-none">DOUBLE</p>
                <p className="mt-1 text-sm">Get <span className="font-black">700 coins</span> for just <span className="font-black">$4.99</span></p>
                <button
                  onClick={() => openCoinModal({ reason: "Claim deal now and get coins instantly.", directCheckout: true })}
                  className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl bg-white px-4 text-base font-black text-primary"
                >
                  Claim deal now
                </button>
              </div>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 dark:border-primary/30 dark:from-primary/15 dark:via-primary/10 dark:to-slate-900/40">
              <p className="text-sm font-semibold text-primary">Welcome back, Alex!</p> 
              <p className="mt-1 text-sm text-foreground/70 dark:text-slate-300">Based on your preferences and activity, here are some profiles you might like.</p>
             
            </div>

            {filteredProfiles.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-card p-8 text-center">
                <Compass className="mx-auto h-8 w-8 text-foreground/50" />
                <p className="mt-3 text-lg font-semibold">No profiles found</p>
                <p className="mt-1 text-sm text-foreground/70">Try resetting filters or search with broader preferences.</p>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-sm font-semibold text-foreground/75">Profiles for you ({topProfiles.length})</p>
                  <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                    {topProfiles.map((profile) => (
                      <ProfileCard key={profile._id} profile={profile} liked={Boolean(liked[profile._id])} onLike={onLike} />
                    ))}
                  </div>
                </div>

                {otherProfiles.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold text-foreground/75">More profiles ({otherProfiles.length})</p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                      {otherProfiles.map((profile) => (
                        <ProfileCard key={profile._id} profile={profile} liked={Boolean(liked[profile._id])} onLike={onLike} />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
