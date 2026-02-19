"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Coins, Loader2, X } from "lucide-react";
import { apiFetch, triggerCoinSync } from "@/lib/client-api";

type GiftItem = {
  id: string;
  key: string;
  name: string;
  category: string;
  coins: number;
  image: string;
  featured: boolean;
};

type GiftModalProps = {
  open: boolean;
  onClose: () => void;
  receiverId: string;
  receiverName: string;
  coins: number;
  onNeedCoins: (reason?: string) => void;
  onGiftSent: (payload: {
    senderCoins: number;
    giftName: string;
    sentMessage?: {
      _id: string;
      sender: string;
      message: string;
      createdAt: string;
      metadata?: { gift?: { name?: string; image?: string } };
    };
  }) => void;
};

function formatCategory(value: string) {
  return value
    .split(" ")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
}

export function GiftModal({
  open,
  onClose,
  receiverId,
  receiverName,
  coins,
  onNeedCoins,
  onGiftSent
}: GiftModalProps) {
  const [loading, setLoading] = useState(false);
  const [sendingId, setSendingId] = useState("");
  const [items, setItems] = useState<GiftItem[]>([]);
  const [featured, setFeatured] = useState<GiftItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const res = await apiFetch("/api/gifts", { retryOn401: true });
      const json = await res.json();
      if (res.ok) {
        setItems((json.data?.items || []) as GiftItem[]);
        setFeatured((json.data?.featured || []) as GiftItem[]);
        const nextCategories = (json.data?.categories || []) as string[];
        setCategories(nextCategories);
        setActiveCategory("all");
      }
      setLoading(false);
    })();
  }, [open]);

  const visibleItems = useMemo(() => {
    if (activeCategory === "all") return items;
    return items.filter((item) => item.category === activeCategory);
  }, [activeCategory, items]);

  async function sendGift(gift: GiftItem) {
    if (!receiverId) return;

    if (coins < gift.coins) {
      onNeedCoins(`You need ${gift.coins} coins for ${gift.name}.`);
      return;
    }

    setSendingId(gift.id);
    const res = await apiFetch("/api/gifts/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      includeCsrf: true,
      body: JSON.stringify({ receiverId, giftId: gift.id })
    });
    const json = await res.json();
    setSendingId("");

    if (res.status === 402) {
      onNeedCoins(json.message || `You need ${gift.coins} coins for ${gift.name}.`);
      return;
    }
    if (!res.ok) return;

    const nextCoins = Number(json.data?.senderCoins ?? coins);
    triggerCoinSync(nextCoins);
    onGiftSent({
      senderCoins: nextCoins,
      giftName: gift.name,
      sentMessage: json.data?.message
        ? {
            _id: String(json.data.message._id),
            sender: String(json.data.message.sender),
            message: String(json.data.message.message || ""),
            createdAt: String(json.data.message.createdAt || new Date().toISOString()),
            metadata: {
              gift: {
                name: json.data?.message?.gift?.name,
                image: json.data?.message?.gift?.image
              }
            }
          }
        : undefined
    });
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-card p-4 shadow-2xl md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold leading-tight md:text-2xl">Send a Virtual Gift to {receiverName}</p>
            <p className="mt-1 text-sm text-foreground/60">Most popular</p>
          </div>
          <button onClick={onClose} className="rounded-xl border border-border p-2">
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-44 animate-pulse rounded-2xl border border-border bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              {featured.map((gift, idx) => (
                <button
                  key={gift.id}
                  onClick={() => sendGift(gift)}
                  disabled={sendingId.length > 0}
                  className="rounded-xl border border-border bg-background p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40"
                >
                  {idx === 0 ? (
                    <span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">MOST LOVED</span>
                  ) : null}
                  <div className="relative mt-2 aspect-[4/3] w-full overflow-hidden rounded-lg">
                    <Image src={gift.image} alt={gift.name} fill className="object-cover" />
                  </div>
                  <p className="mt-2 text-base font-semibold">{gift.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-sm font-semibold leading-none text-primary">
                    {gift.coins}
                    <Coins className="h-3.5 w-3.5 text-primary" />
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-muted/35 p-3">
              <div className="flex flex-wrap gap-4 border-b border-border pb-2 text-sm">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`border-b-2 pb-1 font-semibold ${activeCategory === "all" ? "border-primary text-foreground" : "border-transparent text-foreground/65"}`}
                >
                  All
                </button>
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => setActiveCategory(category)}
                    className={`border-b-2 pb-1 font-semibold ${activeCategory === category ? "border-primary text-foreground" : "border-transparent text-foreground/65"}`}
                  >
                    {formatCategory(category)}
                  </button>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                {visibleItems.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => sendGift(gift)}
                    disabled={sendingId.length > 0}
                    className="rounded-xl border border-border bg-card p-2 text-left shadow-sm transition hover:border-primary/40"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg">
                      <Image src={gift.image} alt={gift.name} fill className="object-cover" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-tight">{gift.name}</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-semibold text-primary">
                      {sendingId === gift.id ? <Loader2 className="h-4 w-4 animate-spin" /> : gift.coins}
                      <Coins className="h-3 w-3 text-primary" />
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
