import { Gift } from "@/models/Gift";

const DEFAULT_GIFTS = [
  {
    key: "sparkling_diamond",
    name: "Sparkling Diamond",
    category: "luxury",
    coins: 500,
    image: "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=800&q=80",
    featured: true,
    sortOrder: 10
  },
  {
    key: "diamond_ring",
    name: "Diamond Ring",
    category: "romantic",
    coins: 420,
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80",
    featured: true,
    sortOrder: 20
  },
  {
    key: "box_of_chocolates",
    name: "Box of Chocolates",
    category: "romantic",
    coins: 100,
    image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?auto=format&fit=crop&w=800&q=80",
    featured: true,
    sortOrder: 30
  },
  {
    key: "flirty_perfume",
    name: "Flirty Perfume",
    category: "sexy",
    coins: 100,
    image: "https://images.unsplash.com/photo-1595425964070-52e4d7f5bf5b?auto=format&fit=crop&w=800&q=80",
    sortOrder: 40
  },
  {
    key: "chic_bag",
    name: "Chic Bag",
    category: "luxury",
    coins: 200,
    image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=800&q=80",
    sortOrder: 50
  },
  {
    key: "designer_bag",
    name: "Designer Bag",
    category: "luxury",
    coins: 400,
    image: "https://images.unsplash.com/photo-1591561954557-26941169b49e?auto=format&fit=crop&w=800&q=80",
    sortOrder: 60
  },
  {
    key: "pearl_earrings",
    name: "Pearl Earrings",
    category: "night out",
    coins: 210,
    image: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=800&q=80",
    sortOrder: 70
  },
  {
    key: "diamond_necklace",
    name: "Diamond Necklace",
    category: "luxury",
    coins: 350,
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=800&q=80",
    sortOrder: 80
  },
  {
    key: "elegant_necklace",
    name: "Elegant Necklace",
    category: "night out",
    coins: 300,
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=800&q=80",
    sortOrder: 90
  },
  {
    key: "red_diamond_ring",
    name: "Red Diamond Ring",
    category: "romantic",
    coins: 330,
    image: "https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?auto=format&fit=crop&w=800&q=80",
    sortOrder: 100
  },
  {
    key: "smart_watch",
    name: "Smart Watch",
    category: "night out",
    coins: 260,
    image: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=800&q=80",
    sortOrder: 110
  },
  {
    key: "vip_roses",
    name: "VIP Roses",
    category: "romantic",
    coins: 150,
    image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
    sortOrder: 120
  }
] as const;

let giftsSeeded = false;

export async function ensureDefaultGifts() {
  if (giftsSeeded) return;

  const existingCount = await Gift.countDocuments();
  if (existingCount > 0) {
    giftsSeeded = true;
    return;
  }

  for (const gift of DEFAULT_GIFTS) {
    await Gift.updateOne(
      { key: gift.key },
      {
        $setOnInsert: {
          ...gift,
          active: true,
          description: ""
        }
      },
      { upsert: true }
    );
  }

  giftsSeeded = true;
}

export async function getActiveGifts() {
  await ensureDefaultGifts();
  return Gift.find({ active: true }).sort({ featured: -1, sortOrder: 1, coins: 1 });
}
