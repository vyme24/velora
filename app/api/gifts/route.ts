import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { withApiHandler } from "@/lib/api";
import { requireAuthUser } from "@/lib/require-auth";
import { getActiveGifts } from "@/lib/gifts";

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const gifts = await getActiveGifts();
    const mapped = gifts.map((gift) => ({
      id: String(gift._id),
      key: gift.key,
      name: gift.name,
      category: gift.category,
      coins: gift.coins,
      image: gift.image,
      featured: Boolean(gift.featured)
    }));

    const featured = mapped.filter((gift) => gift.featured).slice(0, 3);
    const categories = Array.from(new Set(mapped.map((gift) => gift.category))).sort((a, b) => a.localeCompare(b));

    return ok({
      featured,
      categories,
      items: mapped
    });
  });
}

