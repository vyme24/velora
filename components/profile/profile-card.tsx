"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, MapPin, Send } from "lucide-react";

export type UnifiedProfileCardUser = {
  _id: string;
  name: string;
  age?: number;
  photos?: string[];
  interests?: string[];
  location?: { city?: string };
  isOnline?: boolean;
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

export function ProfileCard({
  profile,
  liked = false,
  onLike,
  showActions = true
}: {
  profile: UnifiedProfileCardUser;
  liked?: boolean;
  onLike?: (id: string) => void;
  showActions?: boolean;
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
            {profile.name} {profile.age ? <span className="font-normal text-white/80">{profile.age}</span> : null}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/85">
            <MapPin className="h-3.5 w-3.5" /> {profile.location?.city || "Nearby"} • {milesFromId(profile._id)} miles
          </p>
        </div>
      </Link>

      <div className="border-t border-border/70 bg-card p-2.5 dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex flex-wrap gap-1">
          {(profile.interests || []).slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-foreground/80 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {tag}
            </span>
          ))}
        </div>

        {showActions ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              onClick={() => onLike?.(profile._id)}
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
        ) : null}
      </div>
    </article>
  );
}
