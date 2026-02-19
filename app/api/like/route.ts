import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { Like } from "@/models/Like";
import { Match } from "@/models/Match";
import { verifyCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { withApiHandler } from "@/lib/api";

export async function POST(req: NextRequest) {
  return withApiHandler(req, async () => {
    if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const limit = checkRateLimit(`like:${String(auth.user._id)}`, 120, 60_000);
    if (!limit.allowed) return fail("Too many likes, please slow down", 429);

    const body = (await req.json()) as { receiverId?: string };
    if (!body.receiverId) return fail("receiverId required", 422);
    if (String(auth.user._id) === body.receiverId) return fail("Cannot like yourself", 422);

    await Like.updateOne(
      { sender: auth.user._id, receiver: body.receiverId },
      { $setOnInsert: { sender: auth.user._id, receiver: body.receiverId } },
      { upsert: true }
    );

    const reciprocal = await Like.findOne({ sender: body.receiverId, receiver: auth.user._id });

    if (reciprocal) {
      const userIds = [String(auth.user._id), String(body.receiverId)].sort();
      const existing = await Match.findOne({ user1: userIds[0], user2: userIds[1] });

      if (!existing) {
        await Match.create({
          user1: userIds[0],
          user2: userIds[1],
          initiatedBy: auth.user._id,
          matchedAt: new Date(),
          isActive: true
        });
      }

      return ok({ matched: true });
    }

    return ok({ matched: false });
  });
}
