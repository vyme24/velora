"use client";

import { useEffect, useMemo, useState } from "react";
import { MatchCard } from "@/components/premium/match-card";
import { apiFetch } from "@/lib/client-api";

type MatchUser = { _id: string; name: string; photos?: string[]; isOnline?: boolean };
type MatchItem = { _id: string; user1: MatchUser; user2: MatchUser };

type Me = { userId: string };

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/api/auth/me", { retryOn401: true });
      const meJson = await meRes.json();
      if (meRes.ok) setMe(meJson.data);

      const res = await apiFetch("/api/matches", { retryOn401: true });
      const json = await res.json();
      if (res.ok) setMatches(json.data || []);
    })();
  }, []);

  const cards = useMemo(() => {
    if (!me) return [];
    return matches.map((match) => {
      const other = String(match.user1?._id) === me.userId ? match.user2 : match.user1;
      return {
        id: match._id,
        name: other?.name || "Unknown",
        lastMessage: "Open chat",
        online: Boolean(other?.isOnline),
        image: other?.photos?.[0] || "/profiles/ava.svg"
      };
    });
  }, [matches, me]);

  return (
    <main>
      <h1 className="text-3xl font-semibold">Matches</h1>
      <p className="mt-1 text-sm text-foreground/70">People who liked you back.</p>
      {cards.length ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <MatchCard key={card.id} name={card.name} lastMessage={card.lastMessage} online={card.online} image={card.image} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-foreground/65">No matches yet. Keep swiping.</div>
      )}
    </main>
  );
}
