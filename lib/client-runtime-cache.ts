"use client";

import { apiFetch } from "@/lib/client-api";

type AuthMeData = {
  userId: string;
  role: "user" | "admin" | "super_admin";
  name?: string;
  coins?: number;
  photos?: string[];
};

type CoinPackage = {
  id: string;
  coins: number;
  amount: number;
  currency: string;
  label: string;
  badge: string;
  extra: number;
};

type LimitedOffer = {
  enabled: boolean;
  code: string;
  badge: string;
  headline: string;
  coins: number;
  amountCents: number;
  currency?: string;
  cta: string;
  reason: string;
  label: string;
  subtext: string;
};

type CacheEntry<T> = {
  value: T | null;
  expiresAt: number;
  promise: Promise<T | null> | null;
};

const cache = new Map<string, CacheEntry<unknown>>();

function getEntry<T>(key: string): CacheEntry<T> {
  const current = cache.get(key) as CacheEntry<T> | undefined;
  if (current) return current;
  const created: CacheEntry<T> = { value: null, expiresAt: 0, promise: null };
  cache.set(key, created as CacheEntry<unknown>);
  return created;
}

async function loadWithCache<T>(params: {
  key: string;
  ttlMs: number;
  force?: boolean;
  loader: () => Promise<T | null>;
}): Promise<T | null> {
  const { key, ttlMs, force = false, loader } = params;
  const entry = getEntry<T>(key);
  const now = Date.now();

  if (!force && entry.value !== null && entry.expiresAt > now) return entry.value;
  if (!force && entry.promise) return entry.promise;

  const request = loader()
    .then((value) => {
      entry.value = value;
      entry.expiresAt = Date.now() + ttlMs;
      entry.promise = null;
      return value;
    })
    .catch((error) => {
      entry.promise = null;
      throw error;
    });

  entry.promise = request;
  return request;
}

export function invalidateRuntimeCache(key?: "authMe" | "coinPackages" | "limitedOffer") {
  if (!key) {
    cache.clear();
    return;
  }
  cache.delete(key);
}

export async function getAuthMeCached(options?: { force?: boolean; ttlMs?: number }) {
  const ttlMs = options?.ttlMs ?? 20_000;
  return loadWithCache<AuthMeData>({
    key: "authMe",
    ttlMs,
    force: options?.force,
    loader: async () => {
      const res = await apiFetch("/api/auth/me", { retryOn401: true });
      if (!res.ok) return null;
      const json = await res.json();
      return (json?.data || null) as AuthMeData | null;
    }
  });
}

export async function getCoinPackagesCached(options?: { force?: boolean; ttlMs?: number }) {
  const ttlMs = options?.ttlMs ?? 60_000;
  return loadWithCache<CoinPackage[]>({
    key: "coinPackages",
    ttlMs,
    force: options?.force,
    loader: async () => {
      const res = await apiFetch("/api/coins/packages");
      if (!res.ok) return [];
      const json = await res.json();
      return (json?.data || []) as CoinPackage[];
    }
  });
}

export async function getLimitedOfferCached(options?: { force?: boolean; ttlMs?: number }) {
  const ttlMs = options?.ttlMs ?? 60_000;
  return loadWithCache<LimitedOffer>({
    key: "limitedOffer",
    ttlMs,
    force: options?.force,
    loader: async () => {
      const res = await apiFetch("/api/offers/limited");
      if (!res.ok) return null;
      const json = await res.json();
      return (json?.data || null) as LimitedOffer | null;
    }
  });
}

