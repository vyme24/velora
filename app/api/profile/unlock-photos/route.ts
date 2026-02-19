import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { User } from "@/models/User";
import { ProfileUnlock } from "@/models/ProfileUnlock";
import { CoinLedger } from "@/models/CoinLedger";
import { withApiHandler } from "@/lib/api";
import { getCoinRules } from "@/lib/app-settings";

export async function POST(req: NextRequest) {
  return withApiHandler(req, async () => {
    if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;
    const { profileUnlockCost } = await getCoinRules();

    const limit = checkRateLimit(`photo-unlock:${String(auth.user._id)}`, 30, 60_000);
    if (!limit.allowed) return fail("Too many requests", 429);

    const body = (await req.json()) as { profileUserId?: string };
    if (!body.profileUserId) return fail("profileUserId required", 422);
    if (String(auth.user._id) === body.profileUserId) return fail("Cannot unlock your own profile", 422);

    const targetUser = await User.findById(body.profileUserId).select("_id accountStatus");
    if (!targetUser || targetUser.accountStatus !== "active") return fail("Profile not available", 404);

    const existing = await ProfileUnlock.findOne({
      viewerId: auth.user._id,
      profileUserId: body.profileUserId
    });

    if (existing) {
      const freshUser = await User.findById(auth.user._id).select("coins");
      return ok({ unlocked: true, alreadyUnlocked: true, coins: freshUser?.coins ?? auth.user.coins });
    }

    const deduction = await User.updateOne(
      { _id: auth.user._id, coins: { $gte: profileUnlockCost } },
      { $inc: { coins: -profileUnlockCost } }
    );

    if (!deduction.modifiedCount) {
      return fail(`Insufficient coins. ${profileUnlockCost} coins required`, 402);
    }

    try {
      await ProfileUnlock.create({
        viewerId: auth.user._id,
        profileUserId: body.profileUserId,
        cost: profileUnlockCost
      });

      const updated = await User.findById(auth.user._id).select("coins");

      await CoinLedger.create({
        userId: auth.user._id,
        delta: -profileUnlockCost,
        balanceAfter: updated?.coins ?? 0,
        reason: "photo_unlock",
        metadata: {
          profileUserId: body.profileUserId,
          cost: profileUnlockCost
        }
      });

      return ok({ unlocked: true, cost: profileUnlockCost, coins: updated?.coins ?? 0 });
    } catch (error) {
      await User.updateOne({ _id: auth.user._id }, { $inc: { coins: profileUnlockCost } });
      throw error;
    }
  });
}
