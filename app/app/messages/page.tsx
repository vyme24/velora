"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Camera, ChevronLeft, ChevronRight, Gift, Loader2, Search, SendHorizonal, Sparkles } from "lucide-react";
import { ChatBubble } from "@/components/premium/chat-bubble";
import { Input } from "@/components/ui/input";
import { Toast } from "@/components/ui/toast";
import { apiFetch, triggerCoinSync } from "@/lib/client-api";
import { useCoinModal } from "@/components/coins/coin-modal-provider";
import { GiftModal } from "@/components/messages/gift-modal";

const EmojiPicker = dynamic(() => import("@/components/messages/emoji-picker").then((m) => m.EmojiPicker), {
  ssr: false
});

type MatchUser = { _id: string; name: string; photos?: string[]; isOnline?: boolean };
type MatchItem = { _id: string; user1: MatchUser; user2: MatchUser };
type Me = { userId: string };
type ActiveProfile = {
  _id: string;
  name: string;
  age: number;
  gender: string;
  lookingFor: string;
  bio: string;
  photos: string[];
  interests: string[];
  location?: { city?: string; state?: string; country?: string };
  isOnline: boolean;
};
type MessageItem = {
  _id: string;
  sender: string;
  message: string;
  createdAt: string;
  metadata?: {
    type?: "text" | "image" | "system";
    gift?: {
      id?: string;
      key?: string;
      name?: string;
      image?: string;
      category?: string;
    };
  };
};
type ChatSummary = {
  id: string;
  name: string;
  image: string;
  online: boolean;
  lastMessage: string;
  unreadCount: number;
};
type ConversationItem = {
  userId: string;
  name: string;
  image: string;
  online: boolean;
  lastMessage: string;
  unreadCount: number;
};

const AI_ICEBREAKERS = [
  "Hi gorgeous, what's the best date you've ever had?",
  "What kind of weekend do you enjoy most?",
  "Hey, what are you looking for here?"
];

async function fileToDataUrl(file: File) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 1280;
  const maxHeight = 1280;
  const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1);
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to process image");
  context.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.84);
}

function MessagesLoading() {
  return (
    <main className="grid gap-4 lg:grid-cols-[20rem_1fr_18rem]">
      <div className="min-h-[65vh] animate-pulse rounded-3xl border border-border bg-card" />
      <div className="min-h-[65vh] animate-pulse rounded-3xl border border-border bg-card" />
      <div className="min-h-[65vh] animate-pulse rounded-3xl border border-border bg-card" />
    </main>
  );
}

function MessagesPageClient() {
  const { openCoinModal } = useCoinModal();
  const searchParams = useSearchParams();
  const preferredUserId = String(searchParams.get("user") || "");
  const shouldOpenGift = searchParams.get("gift") === "1";
  const [me, setMe] = useState<Me | null>(null);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [activeUserId, setActiveUserId] = useState("");
  const [directChatUser, setDirectChatUser] = useState<{ id: string; name: string; image: string; online: boolean } | null>(null);
  const [items, setItems] = useState<MessageItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [draft, setDraft] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [search, setSearch] = useState("");
  const [coins, setCoins] = useState(0);
  const [toast, setToast] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [giftOpen, setGiftOpen] = useState(false);
  const [giftAutoHandled, setGiftAutoHandled] = useState(false);
  const [selfTyping, setSelfTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [activeProfile, setActiveProfile] = useState<ActiveProfile | null>(null);
  const [infoPhotoIndex, setInfoPhotoIndex] = useState(0);
  const selfTypingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoReplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await apiFetch("/api/auth/me", { retryOn401: true });
        const meJson = await meRes.json();
        if (!meRes.ok) return;
        setMe(meJson.data);
        setCoins(meJson.data.coins ?? 0);

        const [matchRes, conversationsRes] = await Promise.all([
          apiFetch("/api/matches", { retryOn401: true }),
          apiFetch("/api/chat/conversations", { retryOn401: true })
        ]);
        const matchJson = await matchRes.json();
        const conversationsJson = await conversationsRes.json();

        const rows = matchRes.ok ? ((matchJson.data || []) as MatchItem[]) : [];
        setMatches(rows);
        setConversations(conversationsRes.ok ? (conversationsJson.data?.items || []) : []);

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
        const firstConversation = conversationsRes.ok ? (conversationsJson.data?.items || [])[0] : null;
        if (firstConversation?.userId) {
          setActiveUserId(String(firstConversation.userId));
        } else if (first) {
          const firstOther = String(first.user1?._id) === meJson.data.userId ? first.user2 : first.user1;
          if (firstOther?._id) setActiveUserId(String(firstOther._id));
        }
      } finally {
        setLoadingChats(false);
      }
    })();
  }, [preferredUserId]);

  useEffect(() => {
    setGiftAutoHandled(false);
  }, [preferredUserId, shouldOpenGift]);

  useEffect(() => {
    (async () => {
      await apiFetch("/api/chat/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        includeCsrf: true,
        body: JSON.stringify({})
      });
      window.dispatchEvent(new CustomEvent("velora:badge-sync"));
    })();
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    (async () => {
      setLoadingMessages(true);
      const res = await apiFetch(`/api/chat/messages?receiver=${activeUserId}`, { retryOn401: true });
      const json = await res.json();
      if (res.ok) setItems((json.data?.items || []) as MessageItem[]);

      await apiFetch("/api/chat/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        includeCsrf: true,
        body: JSON.stringify({ userId: activeUserId })
      });
      setConversations((prev) =>
        prev.map((entry) => (entry.userId === activeUserId ? { ...entry, unreadCount: 0 } : entry))
      );
      window.dispatchEvent(new CustomEvent("velora:badge-sync"));
      setLoadingMessages(false);
    })();
  }, [activeUserId]);

  useEffect(() => {
    if (!activeUserId) {
      setActiveProfile(null);
      return;
    }
    (async () => {
      const res = await apiFetch(`/api/profile/${activeUserId}`, { retryOn401: true });
      const json = await res.json();
      if (res.ok && json.data?.profile?._id) {
        setActiveProfile(json.data.profile as ActiveProfile);
        setInfoPhotoIndex(0);
      }
    })();
  }, [activeUserId]);

  const chats = useMemo<ChatSummary[]>(() => {
    if (!me) return [];
    const list: ChatSummary[] = conversations.map((conversation) => ({
      id: conversation.userId,
      name: conversation.name,
      image: conversation.image,
      online: conversation.online,
      lastMessage: conversation.lastMessage,
      unreadCount: conversation.unreadCount
    }));
    const fromMatches = matches.map((m) => {
      const other = String(m.user1?._id) === me.userId ? m.user2 : m.user1;
      return {
        id: String(other?._id || ""),
        name: other?.name || "Unknown",
        image: other?.photos?.[0] || "/profiles/ava.svg",
        online: Boolean(other?.isOnline),
        lastMessage: "",
        unreadCount: 0
      };
    });
    for (const row of fromMatches) {
      if (row.id && !list.some((item) => item.id === row.id)) list.push(row);
    }
    if (directChatUser && !list.some((entry) => entry.id === directChatUser.id)) {
      list.unshift({ ...directChatUser, lastMessage: "", unreadCount: 0 });
    }
    return list;
  }, [conversations, matches, me, directChatUser]);

  const filteredChats = useMemo(
    () => chats.filter((chat) => chat.name.toLowerCase().includes(search.trim().toLowerCase())),
    [chats, search]
  );

  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeUserId) || null, [chats, activeUserId]);

  useEffect(() => {
    if (!shouldOpenGift || giftAutoHandled || !activeChat?.id) return;
    setGiftOpen(true);
    setGiftAutoHandled(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("gift");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [activeChat?.id, giftAutoHandled, shouldOpenGift]);

  useEffect(() => {
    if (!activeUserId) {
      setSelfTyping(false);
      return;
    }
    if (draft.trim()) {
      setSelfTyping(true);
      if (selfTypingTimerRef.current) clearTimeout(selfTypingTimerRef.current);
      selfTypingTimerRef.current = setTimeout(() => setSelfTyping(false), 1200);
    } else {
      setSelfTyping(false);
    }
  }, [draft, activeUserId]);

  useEffect(() => {
    return () => {
      if (selfTypingTimerRef.current) clearTimeout(selfTypingTimerRef.current);
      if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
    };
  }, []);

  function isVideoUrl(url: string) {
    return /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url);
  }

  async function onSend() {
    if (!activeUserId || !draft.trim()) return;
    const sourceMessage = draft.trim();
    setSending(true);
    const res = await apiFetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ receiver: activeUserId, message: sourceMessage })
    });
    const json = await res.json();
    if (!res.ok) {
      setToast(json.message || "Unable to send");
      setTimeout(() => setToast(""), 1600);
      if (res.status === 402) openCoinModal(json.message || "Insufficient coins for message");
      setSending(false);
      return;
    }
    setItems((prev) => [...prev, json.data]);
    setConversations((prev) => {
      const message = String(json.data?.message || sourceMessage).trim();
      const existing = prev.find((entry) => entry.userId === activeUserId);
      if (!existing) {
        return [
          {
            userId: activeUserId,
            name: activeChat?.name || "Chat",
            image: activeChat?.image || "/profiles/ava.svg",
            online: Boolean(activeChat?.online),
            lastMessage: message,
            unreadCount: 0
          },
          ...prev
        ];
      }
      return [
        { ...existing, lastMessage: message, unreadCount: 0 },
        ...prev.filter((entry) => entry.userId !== activeUserId)
      ];
    });
    const nextCoins = json.data.senderCoins ?? coins;
    setCoins(nextCoins);
    triggerCoinSync(nextCoins);
    setDraft("");
    setSelfTyping(false);
    setSending(false);

    setPartnerTyping(true);
    const pendingUserId = activeUserId;
    if (autoReplyTimerRef.current) clearTimeout(autoReplyTimerRef.current);
    autoReplyTimerRef.current = setTimeout(async () => {
      const replyRes = await apiFetch("/api/chat/auto-reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        includeCsrf: true,
        body: JSON.stringify({ receiverId: pendingUserId, sourceMessage })
      });
      const replyJson = await replyRes.json().catch(() => ({}));
      setPartnerTyping(false);
      const replyMessage = (replyJson?.data || null) as MessageItem | null;
      if (!replyRes.ok || !replyMessage?._id) return;
      if (pendingUserId !== activeUserId) return;

      setItems((prev) => [...prev, replyMessage]);
      setConversations((prev) => {
        const existing = prev.find((entry) => entry.userId === pendingUserId);
        const replyText = String(replyMessage.message || "").trim();
        if (!existing) return prev;
        return [{ ...existing, lastMessage: replyText, unreadCount: 0 }, ...prev.filter((entry) => entry.userId !== pendingUserId)];
      });
    }, 1600 + Math.floor(Math.random() * 1200));
  }

  function openGiftDialog() {
    if (!activeChat) {
      setToast("Select a chat first");
      setTimeout(() => setToast(""), 1500);
      return;
    }
    setGiftOpen(true);
  }

  async function sendImageMessage(file: File) {
    if (!activeUserId) {
      setToast("Select a chat first");
      setTimeout(() => setToast(""), 1400);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setToast("Only image files are supported");
      setTimeout(() => setToast(""), 1600);
      return;
    }

    setUploadingMedia(true);
    try {
      const imageDataUrl = await fileToDataUrl(file);
      const res = await apiFetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        includeCsrf: true,
        body: JSON.stringify({
          receiver: activeUserId,
          image: imageDataUrl,
          message: draft.trim()
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setToast(json.message || "Unable to send image");
        setTimeout(() => setToast(""), 1600);
        if (res.status === 402) openCoinModal(json.message || "Insufficient coins for image message");
        return;
      }

      setItems((prev) => [...prev, json.data]);
      setConversations((prev) => {
        const text = json.data?.message?.trim() || "Sent a photo";
        const existing = prev.find((entry) => entry.userId === activeUserId);
        if (!existing) {
          return [
            {
              userId: activeUserId,
              name: activeChat?.name || "Chat",
              image: activeChat?.image || "/profiles/ava.svg",
              online: Boolean(activeChat?.online),
              lastMessage: text,
              unreadCount: 0
            },
            ...prev
          ];
        }
        return [{ ...existing, lastMessage: text, unreadCount: 0 }, ...prev.filter((entry) => entry.userId !== activeUserId)];
      });

      const nextCoins = json.data?.senderCoins ?? coins;
      setCoins(nextCoins);
      triggerCoinSync(nextCoins);
      setDraft("");
      setToast("Photo sent");
      setTimeout(() => setToast(""), 1200);
    } catch {
      setToast("Could not process image");
      setTimeout(() => setToast(""), 1600);
    } finally {
      setUploadingMedia(false);
    }
  }

  return (
    <main className="grid gap-4 lg:grid-cols-[20rem_1fr_18rem]">
      <aside className="rounded-3xl border border-border bg-card p-3">
        <p className="px-2 pb-2 text-sm font-semibold">Chats</p>
        <div className="px-2 pb-2">
          <div className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3">
            <Search className="h-4 w-4 text-foreground/50" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>
        <div className="space-y-2">
          {loadingChats ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={`chat-skel-${index}`} className="flex items-center gap-3 rounded-2xl px-2 py-2">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))
          ) : filteredChats.length ? (
            filteredChats.map((chat) => (
              <button
                key={chat.id}
                onClick={() => setActiveUserId(chat.id)}
                className={`flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-muted ${activeUserId === chat.id ? "bg-muted" : ""}`}
              >
                <div className="relative h-10 w-10 overflow-hidden rounded-full">
                  <Image src={chat.image} alt={chat.name} fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{chat.name}</p>
                    {chat.unreadCount ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-foreground/70">{chat.lastMessage || (chat.online ? "Online" : "Offline")}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="px-2 py-2 text-xs text-foreground/65">No chats yet.</p>
          )}
        </div>
      </aside>

      <section className="flex min-h-[65vh] flex-col rounded-3xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {activeChat ? (
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full">
                  <Image src={activeChat.image} alt={activeChat.name} fill className="object-cover" />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="truncate font-semibold">{activeChat?.name || "Select chat"}</p>
                {activeChat ? (
                  <p className="text-xs text-foreground/65">{activeChat.online ? "Online now" : "Offline"}</p>
                ) : null}
              </div>
            </div>
            {activeChat ? (
              <Link href={`/app/profile/${activeChat.id}`} className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                View profile
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {!activeUserId ? (
            <div className="flex h-full items-center justify-center text-sm text-foreground/65">Select a user to start chatting.</div>
          ) : loadingMessages ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`msg-skel-${index}`}
                  className={`h-10 max-w-[70%] animate-pulse rounded-2xl bg-muted ${index % 2 ? "ml-auto" : ""}`}
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-foreground/65">No messages yet. Say hello first.</div>
          ) : (
            items.map((m) => (
              m.metadata?.gift?.image ? (
                <div key={m._id} className={`flex ${String(m.sender) === String(me?.userId) ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[280px] rounded-2xl border border-border bg-card p-2">
                    <div className="relative h-28 w-full overflow-hidden rounded-xl bg-muted">
                      <Image src={m.metadata.gift.image} alt={m.metadata.gift.name || "Gift"} fill className="object-contain" />
                    </div>
                    <p className="mt-2 text-sm font-semibold">{m.metadata.gift.name || "Virtual Gift"}</p>
                    <p className="text-xs text-foreground/65">{m.message}</p>
                  </div>
                </div>
              ) : m.image ? (
                <div key={m._id} className={`flex ${String(m.sender) === String(me?.userId) ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[320px] rounded-2xl border border-border bg-card p-2">
                    <div className="overflow-hidden rounded-xl bg-muted">
                      {isVideoUrl(m.image) ? (
                        <video src={m.image} controls className="max-h-72 w-full object-cover" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.image} alt="Shared media" className="max-h-72 w-full object-cover" />
                      )}
                    </div>
                    {m.message ? <p className="mt-2 text-xs text-foreground/70">{m.message}</p> : null}
                  </div>
                </div>
              ) : (
                <ChatBubble
                  key={m._id}
                  sender={String(m.sender) === String(me?.userId) ? "me" : "them"}
                  text={m.message || ""}
                  time={new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                />
              )
            ))
          )}
          {partnerTyping && activeChat ? (
            <div className="flex justify-start">
              <div className="inline-flex items-center gap-1 rounded-2xl border border-border bg-muted px-3 py-2 text-xs text-foreground/70">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                <span className="ml-1">{activeChat.name} is typing...</span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="sticky bottom-0 border-t border-border bg-card p-3">
          {selfTyping && activeChat ? (
            <p className="mb-2 text-xs text-foreground/60">Typing to {activeChat.name}...</p>
          ) : null}
          {activeUserId ? (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" /> AI prompts
              </span>
              {AI_ICEBREAKERS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setDraft(prompt)}
                  className="line-clamp-1 rounded-full border border-primary/25 bg-primary/5 px-3 py-1 text-xs text-primary transition hover:bg-primary/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}
          {showEmoji ? <div className="mb-2"><EmojiPicker onPick={(emoji) => setDraft((v) => `${v}${emoji}`)} /></div> : null}
          <div className="flex items-center gap-2">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void sendImageMessage(file);
                event.currentTarget.value = "";
              }}
            />
            <button onClick={() => setShowEmoji((v) => !v)} className="h-11 rounded-2xl border border-border px-3 text-sm">🙂</button>
            <button
              onClick={() => cameraInputRef.current?.click()}
              disabled={!activeUserId || sending || uploadingMedia}
              className="h-11 rounded-2xl border border-border px-3 text-sm disabled:opacity-60"
              aria-label="Upload photo"
              title="Upload photo"
            >
              {uploadingMedia ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <button onClick={openGiftDialog} className="h-11 rounded-2xl border border-border px-3 text-sm"><Gift className="h-4 w-4" /></button>
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Type a message..." />
            <button
              onClick={onSend}
              disabled={!activeUserId || !draft.trim() || sending}
              className="inline-flex h-11 items-center gap-1 rounded-2xl bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
              Send
            </button>
          </div>
        </div>
      </section>

      <aside className="hidden rounded-3xl border border-border bg-card p-4 lg:block">
        <p className="text-sm font-semibold">User info</p>
        {activeChat && activeProfile ? (
          <div className="mt-3 space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted">
              <div className="relative aspect-[4/5]">
                <Image
                  src={activeProfile.photos?.[infoPhotoIndex] || activeChat.image}
                  alt={activeChat.name}
                  fill
                  className="object-cover"
                />
              </div>
              {(activeProfile.photos?.length || 0) > 1 ? (
                <>
                  <button
                    onClick={() =>
                      setInfoPhotoIndex((prev) =>
                        prev === 0 ? (activeProfile.photos?.length || 1) - 1 : prev - 1
                      )
                    }
                    className="absolute left-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60"
                    aria-label="Previous photo"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() =>
                      setInfoPhotoIndex((prev) => (prev + 1) % (activeProfile.photos?.length || 1))
                    }
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white hover:bg-black/60"
                    aria-label="Next photo"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>
            {(activeProfile.photos?.length || 0) > 1 ? (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {activeProfile.photos.map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    onClick={() => setInfoPhotoIndex(index)}
                    className={`relative h-14 w-12 shrink-0 overflow-hidden rounded-lg border ${
                      index === infoPhotoIndex ? "border-primary ring-1 ring-primary/35" : "border-border"
                    }`}
                  >
                    <Image src={photo} alt={`${activeProfile.name} ${index + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground/65">Profile</p>
              <p className="mt-1 text-base font-semibold">
                {activeProfile.name}, {activeProfile.age}
              </p>
              <p className="text-xs text-foreground/65">{activeProfile.isOnline ? "Online now" : "Offline"}</p>
              <p className="mt-1 text-xs text-foreground/65">
                {[activeProfile.location?.city, activeProfile.location?.state, activeProfile.location?.country].filter(Boolean).join(", ") || "Location not set"}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">{activeProfile.gender}</span>
              <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]">Looking for {activeProfile.lookingFor}</span>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-2">
              <p className="text-xs font-semibold">Bio</p>
              <p className="mt-1 line-clamp-4 text-xs text-foreground/75">{activeProfile.bio || "No bio yet."}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-2">
              <p className="text-xs font-semibold">Interests</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {(activeProfile.interests || []).slice(0, 8).map((interest) => (
                  <span key={interest} className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px]">
                    {interest}
                  </span>
                ))}
              </div>
            </div>
            <Link href={`/app/profile/${activeChat.id}`} className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold hover:bg-muted">
              Open full profile
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm text-foreground/65">Select a conversation to view profile details.</p>
        )}
      </aside>
      <GiftModal
        open={giftOpen}
        onClose={() => setGiftOpen(false)}
        receiverId={activeChat?.id || ""}
        receiverName={activeChat?.name || "User"}
        coins={coins}
        onNeedCoins={(reason) => openCoinModal(reason || "Insufficient coins to send gift")}
        onGiftSent={(payload) => {
          setCoins(payload.senderCoins);
          triggerCoinSync(payload.senderCoins);
          if (payload.sentMessage) {
            setItems((prev) => [...prev, payload.sentMessage!]);
          }
          setToast(`Gift sent: ${payload.giftName}`);
          setTimeout(() => setToast(""), 1400);
        }}
      />
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
