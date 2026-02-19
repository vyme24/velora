"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Gift,
  Lock,
  MapPin,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  Heart
} from "lucide-react";
import { apiFetch, triggerCoinModal, triggerCoinSync } from "@/lib/client-api";
import { Toast } from "@/components/ui/toast";

type ProfileDetails = {
  _id: string;
  name: string;
  age: number;
  gender: string;
  lookingFor: string;
  bio: string;
  photos: string[];
  totalPhotos: number;
  interests: string[];
  location?: { city?: string; state?: string; country?: string };
  isOnline: boolean;
  isVerified: boolean;
  createdAt?: string;
  privatePhotosLocked: boolean;
  unlockCost: number;
  likedByViewer: boolean;
  isSelf: boolean;
};

export default function PublicProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const profileId = String(params?.id || "");
  const [profile, setProfile] = useState<ProfileDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [toast, setToast] = useState("");
  const [photoIndex, setPhotoIndex] = useState(0);

  const loadProfile = useCallback(async () => {
    if (!profileId) return;
    setLoading(true);
    const res = await apiFetch(`/api/profile/${profileId}`, { retryOn401: true });
    const json = await res.json();
    if (res.ok) {
      setProfile(json.data?.profile || null);
      setPhotoIndex(0);
    } else {
      setToast(json.message || "Unable to load profile");
      setTimeout(() => setToast(""), 1800);
    }
    setLoading(false);
  }, [profileId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const locationLabel = useMemo(() => {
    if (!profile?.location) return "Location not set";
    const items = [profile.location.city, profile.location.state, profile.location.country].filter(Boolean);
    return items.length ? items.join(", ") : "Location not set";
  }, [profile]);

  function nextPhoto() {
    if (!profile?.photos?.length) return;
    setPhotoIndex((prev) => (prev + 1) % profile.photos.length);
  }

  function prevPhoto() {
    if (!profile?.photos?.length) return;
    setPhotoIndex((prev) => (prev - 1 + profile.photos.length) % profile.photos.length);
  }

  async function onLike() {
    if (!profile || profile.isSelf || profile.likedByViewer) return;
    setActionLoading("like");
    const res = await apiFetch("/api/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ receiverId: profile._id })
    });
    const json = await res.json();
    setActionLoading("");
    if (!res.ok) {
      setToast(json.message || "Unable to send like");
      setTimeout(() => setToast(""), 1800);
      return;
    }
    setToast(json.data?.matched ? "It is a match" : "Like sent");
    setTimeout(() => setToast(""), 1400);
    await loadProfile();
  }

  async function onUnlock() {
    if (!profile || !profile.privatePhotosLocked) return;
    setActionLoading("unlock");
    const res = await apiFetch("/api/profile/unlock-photos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ profileUserId: profile._id })
    });
    const json = await res.json();
    setActionLoading("");
    if (!res.ok) {
      setToast(json.message || "Unable to unlock photos");
      setTimeout(() => setToast(""), 1800);
      return;
    }
    triggerCoinSync(json.data?.coins);
    setToast(`Unlocked all photos for ${profile.unlockCost} coins`);
    setTimeout(() => setToast(""), 1400);
    await loadProfile();
  }

  async function sendQuickMessage(mode: "hello" | "ai") {
    if (!profile || profile.isSelf) return;
    setActionLoading(mode);

    const message =
      mode === "hello"
        ? `Hey ${profile.name}, nice to meet you 👋`
        : `Hi ${profile.name}, your profile stood out to me. I would love to know more about you ✨`;

    const res = await apiFetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ receiver: profile._id, message })
    });
    const json = await res.json();
    setActionLoading("");

    if (!res.ok) {
      setToast(json.message || "Unable to send message");
      setTimeout(() => setToast(""), 1800);
      return;
    }

    if (typeof json.data?.senderCoins === "number") {
      triggerCoinSync(json.data.senderCoins);
    }

    setToast(mode === "hello" ? "Hello sent" : "AI message sent");
    setTimeout(() => setToast(""), 1200);
    router.push(`/app/messages?user=${profile._id}`);
  }

  if (loading) {
    return (
      <main className="space-y-4">
        <div className="h-12 w-72 animate-pulse rounded-xl bg-muted" />
        <div className="h-[520px] animate-pulse rounded-3xl bg-muted" />
        <div className="h-40 animate-pulse rounded-3xl bg-muted" />
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="rounded-3xl border border-border bg-card p-6">
        <p className="text-lg font-semibold">Profile not found</p>
        <Link href="/app/discover" className="mt-3 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white">
          Back to discover
        </Link>
      </main>
    );
  }

  const currentPhoto = profile.photos?.[photoIndex] || "/profiles/ava.svg";

  return (
    <main className="space-y-5 pb-8">
     

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(420px,0.85fr)]">
        <div className="space-y-4">
           <header className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-background to-primary/5 p-4 shadow-sm md:p-6">
        <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/app/discover" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background/80 hover:bg-muted">
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-border bg-muted">
              <Image src={currentPhoto} alt={profile.name} fill className="object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold leading-none">
                {profile.name}, {profile.age}
              </h1>
              <p className="mt-1 inline-flex items-center gap-1 text-sm text-foreground/70">
                <MapPin className="h-4 w-4" /> {locationLabel}
              </p>
            </div>
          </div>

          {profile.isOnline ? (
            <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">ONLINE</span>
          ) : null}
        </div>

        <div className="relative mt-4 flex flex-wrap gap-2">
          {profile.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-500">
              <CheckCircle2 className="h-4 w-4" /> Verified
            </span>
          ) : null}
          <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-sm">{profile.gender}</span>
          <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-sm">Looking for {profile.lookingFor}</span>
          <span className="rounded-full border border-border bg-background/80 px-3 py-1 text-sm">Age {profile.age}</span>
        </div>
      </header>
          {!profile.isSelf ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => sendQuickMessage("hello")}
                disabled={actionLoading.length > 0}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-white shadow-sm transition hover:translate-y-[-1px] hover:bg-primary/90"
              >
                <MessageCircle className="h-5 w-5" /> {actionLoading === "hello" ? "Sending..." : "Say hello"}
              </button>

              <button
                onClick={() => triggerCoinModal("Gifts require coins. Add coins to continue.")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-background px-5 text-base font-semibold text-primary transition hover:bg-primary/5"
              >
                <Gift className="h-5 w-5" /> Send a gift
              </button>
            </div>
          ) : null}

          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-wide text-foreground/65">Bio</p>
            <p className="mt-3 text-xl leading-snug text-foreground/85">{profile.bio || "No bio added yet."}</p>
          </article>

          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-2xl font-semibold">About Me</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm">{profile.gender}</span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm">Looking for {profile.lookingFor}</span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm">Age {profile.age}</span>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-sm">{locationLabel}</span>
            </div>
          </article>

          <article className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-2xl font-semibold">Interests</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(profile.interests || []).length ? (
                profile.interests.map((interest) => (
                  <span key={interest} className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium">
                    {interest}
                  </span>
                ))
              ) : (
                <p className="text-sm text-foreground/65">No interests added yet.</p>
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-background p-5 shadow-sm">
            <p className="inline-flex items-center gap-2 text-xl font-semibold text-primary">
              <Sparkles className="h-5 w-5" /> AI Conversation Starter
            </p>
            <p className="mt-3 text-lg font-semibold leading-tight text-foreground">
              Nice to meet you, what would you like to talk about first?
            </p>
            {!profile.isSelf ? (
              <button
                onClick={() => sendQuickMessage("ai")}
                disabled={actionLoading.length > 0}
                className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-white transition hover:bg-primary/90"
              >
                <Bot className="h-5 w-5" /> {actionLoading === "ai" ? "Sending..." : "Send AI message"}
              </button>
            ) : null}
          </article>
        </div>

        <article className="self-start rounded-3xl border border-border bg-card p-3 shadow-sm md:p-4 lg:sticky lg:top-24">
          <div className="relative overflow-hidden rounded-2xl bg-muted">
            <div className="relative h-[68vh] min-h-[560px] max-h-[860px] md:h-[74vh] lg:h-[78vh]">
              <Image src={currentPhoto} alt={profile.name} fill className="object-cover" />
              <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black/25 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black/25 to-transparent" />

              {profile.photos.length > 1 ? (
                <>
                  <button onClick={prevPhoto} className="absolute left-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-black/45 text-white hover:bg-black/60">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button onClick={nextPhoto} className="absolute right-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl bg-black/45 text-white hover:bg-black/60">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              ) : null}

              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
                {profile.photos.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setPhotoIndex(index)}
                    className={`h-2.5 w-2.5 rounded-full ${index === photoIndex ? "bg-white" : "bg-white/55"}`}
                    aria-label={`Open photo ${index + 1}`}
                  />
                ))}
              </div>

              {!profile.isSelf ? (
                <button
                  onClick={onLike}
                  disabled={profile.likedByViewer || actionLoading.length > 0}
                  className="absolute bottom-3 right-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60 disabled:opacity-60"
                  aria-label="Like profile"
                >
                  <Heart className="h-6 w-6" />
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-sm font-semibold text-foreground/75">All photos</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {profile.photos.map((photo, index) => (
                <button
                  key={`${photo}-${index}`}
                  onClick={() => setPhotoIndex(index)}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border ${
                    index === photoIndex ? "border-primary ring-1 ring-primary/35" : "border-border"
                  }`}
                >
                  <Image src={photo || "/profiles/ava.svg"} alt={`${profile.name} thumbnail ${index + 1}`} fill className="object-cover" />
                </button>
              ))}

              {profile.privatePhotosLocked
                ? Array.from({ length: Math.max(0, profile.totalPhotos - profile.photos.length) }).map((_, index) => (
                    <div
                      key={`locked-thumb-${index}`}
                      className="grid h-20 w-16 shrink-0 place-items-center rounded-lg border border-border bg-muted text-foreground/55"
                    >
                      <Lock className="h-4 w-4" />
                    </div>
                  ))
                : null}
            </div>
          </div>

          {profile.privatePhotosLocked ? (
            <div className="mt-3 rounded-2xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-sm font-semibold text-primary">Only first photo is visible.</p>
              <p className="mt-1 text-sm text-foreground/70">Unlock all remaining photos to view the full gallery.</p>
              <button
                onClick={onUnlock}
                disabled={actionLoading.length > 0}
                className="mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 text-sm font-semibold text-primary"
              >
                <Lock className="h-4 w-4" /> {actionLoading === "unlock" ? "Unlocking..." : `Unlock all photos (${profile.unlockCost} coins)`}
              </button>
            </div>
          ) : null}
        </article>
      </section>

      {!profile.isSelf ? (
        <button
          onClick={() => setToast("Report submitted")}
          className="mx-auto inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-foreground/60 hover:bg-muted"
        >
          <ShieldAlert className="h-4 w-4" /> Report this profile
        </button>
      ) : null}

      <Toast open={Boolean(toast)} message={toast} />
    </main>
  );
}
