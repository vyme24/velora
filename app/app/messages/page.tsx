"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatBubble } from "@/components/premium/chat-bubble";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { apiFetch, triggerCoinSync } from "@/lib/client-api";

const EmojiPicker = dynamic(() => import("@/components/messages/emoji-picker").then((m) => m.EmojiPicker), {
  ssr: false
});

type MatchUser = { _id: string; name: string; photos?: string[]; isOnline?: boolean };
type MatchItem = { _id: string; user1: MatchUser; user2: MatchUser };
type Me = { userId: string };
type MessageItem = { _id: string; sender: string; message: string; createdAt: string };

function MessagesLoading() {
  return (
    <main className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <div className="min-h-[65vh] animate-pulse rounded-3xl border border-border bg-card" />
      <div className="min-h-[65vh] animate-pulse rounded-3xl border border-border bg-card" />
    </main>
  );
}

function MessagesPageClient() {
  const searchParams = useSearchParams();
  const preferredUserId = String(searchParams.get("user") || "");
  const [me, setMe] = useState<Me | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [directChatUser, setDirectChatUser] = useState<{ id: string; name: string; image: string; online: boolean } | null>(null);
  const [items, setItems] = useState<MessageItem[]>([]);
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [coins, setCoins] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      const meRes = await apiFetch("/api/auth/me", { retryOn401: true });
      const meJson = await meRes.json();
      if (!meRes.ok) return;
      setMe(meJson.data);
      setCoins(meJson.data.coins ?? 0);

      const matchRes = await apiFetch("/api/matches", { retryOn401: true });
      const matchJson = await matchRes.json();
      if (!matchRes.ok) return;
      const rows = (matchJson.data || []) as MatchItem[];
      setMatches(rows);

      if (preferredUserId) {
        setActiveUserId(preferredUserId);
        const inMatches = rows.some((row) => String(row.user1?._id) === preferredUserId || String(row.user2?._id) === preferredUserId);
        if (!inMatches) {
          const profileRes = await apiFetch(`/api/profile/${preferredUserId}`, { retryOn401: true });
          const profileJson = await profileRes.json();
          if (profileRes.ok && profileJson.data?.profile?._id) {
            setDirectChatUser({
              id: String(profileJson.data.profile._id),
              name: profileJson.data.profile.name || "Chat",
              image: profileJson.data.profile.photos?.[0] || "/profiles/ava.svg",
              online: Boolean(profileJson.data.profile.isOnline)
            });
          }
        }
        return;
      }

      const first = rows[0];
      if (!first) return;
      const firstOther = String(first.user1?._id) === meJson.data.userId ? first.user2 : first.user1;
      if (firstOther?._id) setActiveUserId(String(firstOther._id));
    })();
  }, [preferredUserId]);

  useEffect(() => {
    if (!activeUserId) return;
    (async () => {
      const res = await apiFetch(`/api/chat/messages?receiver=${activeUserId}`, { retryOn401: true });
      const json = await res.json();
      if (!res.ok) return;
      setItems((json.data?.items || []) as MessageItem[]);
    })();
  }, [activeUserId]);

  const chats = useMemo(() => {
    if (!me) return [] as Array<{ id: string; name: string; image: string; online: boolean }>;
    const list = matches.map((m) => {
      const other = String(m.user1?._id) === me.userId ? m.user2 : m.user1;
      return {
        id: String(other?._id || ""),
        name: other?.name || "Unknown",
        image: other?.photos?.[0] || "/profiles/ava.svg",
        online: Boolean(other?.isOnline)
      };
    });
    if (directChatUser && !list.some((entry) => entry.id === directChatUser.id)) {
      list.unshift(directChatUser);
    }
    return list;
  }, [matches, me, directChatUser]);

  async function onSend() {
    if (!activeUserId || !draft.trim()) return;
    const res = await apiFetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ receiver: activeUserId, message: draft })
    });
    const json = await res.json();
    if (!res.ok) {
      setToast(json.message || "Unable to send");
      setTimeout(() => setToast(""), 1600);
      return;
    }
    setItems((prev) => [...prev, json.data]);
    const nextCoins = json.data.senderCoins ?? coins;
    setCoins(nextCoins);
    triggerCoinSync(nextCoins);
    setDraft("");
  }

  return (
    <main className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <div className="rounded-3xl border border-border bg-card p-3">
        <p className="px-2 pb-3 text-sm font-semibold">Chats</p>
        <p className="px-2 pb-3 text-xs text-primary">Balance: {coins} coins | 50 coins/message</p>
        <div className="space-y-2">
          {chats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => setActiveUserId(chat.id)}
              className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-muted ${activeUserId === chat.id ? "bg-muted" : ""}`}
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-full">
                <Image src={chat.image} alt={chat.name} fill className="object-cover" />
              </div>
              <div>
                <p className="text-sm font-semibold">{chat.name}</p>
                <p className="text-xs text-foreground/70">{chat.online ? "Online" : "Offline"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-[65vh] flex-col rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <p className="font-semibold">{chats.find((c) => c.id === activeUserId)?.name || "Select chat"}</p>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {items.map((m) => (
            <ChatBubble key={m._id} sender={String(m.sender) === String(me?.userId) ? "me" : "them"} text={m.message || ""} time={new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} />
          ))}
        </div>
        <div className="sticky bottom-0 border-t border-border bg-card p-3">
          {showEmoji ? <div className="mb-2"><EmojiPicker onPick={(emoji) => setDraft((v) => `${v}${emoji}`)} /></div> : null}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowEmoji((v) => !v)} className="h-11 rounded-2xl border border-border px-3 text-sm">🙂</button>
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message" />
            <button onClick={onSend} className="h-11 rounded-2xl bg-velora-gradient px-4 text-sm font-semibold text-white">Send</button>
          </div>
        </div>
      </div>
      <Toast open={Boolean(toast)} message={toast} />
    </main>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<MessagesLoading />}>
      <MessagesPageClient />
    </Suspense>
  );
}
