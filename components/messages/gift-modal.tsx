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

const CURATED_GIFT_IMAGES: Record<string, string> = {
  sparkling_diamond: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=80",
  diamond_ring: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80",
  box_of_chocolates: "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=900&q=80",
  flirty_perfume: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=80",
  chic_bag: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=900&q=80",
  designer_bag: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80",
  pearl_earrings: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=900&q=80",
  diamond_necklace: "https://images.unsplash.com/photo-1611085583191-a3b181a88401?auto=format&fit=crop&w=900&q=80",
  elegant_necklace: "https://images.unsplash.com/photo-1535556116002-6281ff3e9f36?auto=format&fit=crop&w=900&q=80",
  red_diamond_ring: "https://images.unsplash.com/photo-1603561596112-db7fbd0b1b80?auto=format&fit=crop&w=900&q=80",
  smart_watch: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
  vip_roses: "https://images.unsplash.com/photo-1518895949257-7621c3c786d7?auto=format&fit=crop&w=900&q=80"
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

function getGiftImage(gift: GiftItem) {
  return CURATED_GIFT_IMAGES[gift.key] || gift.image || "/profiles/ava.svg";
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
      <div className="w-full max-w-3xl max-h-[84vh] overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-2xl md:p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold leading-tight md:text-xl">Send a Gift to {receiverName}</p>
            <p className="mt-0.5 text-xs text-foreground/60">Choose a gift and send instantly</p>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-1.5">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 max-h-[72vh] overflow-y-auto pr-1">
        {loading ? (
          <div className="grid gap-2 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-32 animate-pulse rounded-xl border border-border bg-muted" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid gap-2 md:grid-cols-3">
              {featured.map((gift, idx) => (
                <button
                  key={gift.id}
                  onClick={() => sendGift(gift)}
                  disabled={sendingId.length > 0}
                  className="rounded-xl border border-border bg-background p-2 text-left shadow-sm transition hover:border-primary/40"
                >
                  {idx === 0 ? (
                    <span className="inline-flex rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-white">MOST LOVED</span>
                  ) : null}
                  <div className="relative mt-1.5 aspect-[16/10] w-full overflow-hidden rounded-lg bg-muted">
                    <Image src={getGiftImage(gift)} alt={gift.name} fill className="object-cover" />
                  </div>
                  <p className="mt-1.5 line-clamp-1 text-sm font-semibold">{gift.name}</p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-xs font-semibold leading-none text-primary">
                    {gift.coins}
                    <Coins className="h-3 w-3 text-primary" />
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-border bg-muted/35 p-2.5">
              <div className="flex flex-wrap gap-3 border-b border-border pb-2 text-xs">
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

              <div className="mt-2.5 grid grid-cols-3 gap-2 md:grid-cols-5">
                {visibleItems.map((gift) => (
                  <button
                    key={gift.id}
                    onClick={() => sendGift(gift)}
                    disabled={sendingId.length > 0}
                    className="rounded-lg border border-border bg-card p-1.5 text-left shadow-sm transition hover:border-primary/40"
                  >
                    <div className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                      <Image src={getGiftImage(gift)} alt={gift.name} fill className="object-cover" />
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-xs font-semibold leading-tight">{gift.name}</p>
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-primary">
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
    </div>
  );
}
