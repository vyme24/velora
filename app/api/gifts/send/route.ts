import { NextRequest } from "next/server";
import { Types } from "mongoose";
import { fail, ok } from "@/lib/http";
import { withApiHandler } from "@/lib/api";
import { requireAuthUser } from "@/lib/require-auth";
import { verifyCsrf } from "@/lib/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { Gift } from "@/models/Gift";
import { User } from "@/models/User";
import { Message } from "@/models/Message";
import { GiftTransaction } from "@/models/GiftTransaction";
import { CoinLedger } from "@/models/CoinLedger";

export async function POST(req: NextRequest) {
  return withApiHandler(req, async () => {
    if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const limiter = checkRateLimit(`gift:${String(auth.user._id)}`, 30, 60_000);
    if (!limiter.allowed) return fail("Too many gift attempts", 429);

    const body = (await req.json()) as { receiverId?: string; giftId?: string };
    if (!body.receiverId || !body.giftId) return fail("receiverId and giftId are required", 422);
    if (!Types.ObjectId.isValid(body.receiverId) || !Types.ObjectId.isValid(body.giftId)) {
      return fail("Invalid receiver or gift", 422);
    }
    if (String(auth.user._id) === String(body.receiverId)) return fail("Cannot send gift to yourself", 422);

    const [gift, receiver] = await Promise.all([
      Gift.findOne({ _id: body.giftId, active: true }),
      User.findOne({ _id: body.receiverId, accountStatus: "active" }).select("_id")
    ]);

    if (!gift) return fail("Gift not found", 404);
    if (!receiver) return fail("Receiver not found", 404);

    const deduction = await User.updateOne(
      { _id: auth.user._id, coins: { $gte: gift.coins } },
      { $inc: { coins: -gift.coins } }
    );
    if (!deduction.modifiedCount) {
      return fail(`Insufficient coins. ${gift.coins} coins required for ${gift.name}`, 402);
    }

    const message = await Message.create({
      sender: auth.user._id,
      receiver: receiver._id,
      message: `sent you a virtual gift: ${gift.name}`,
      image: gift.image,
      metadata: {
        type: "system",
        requiresCoins: true,
        consumedCoins: gift.coins,
        gift: {
          id: String(gift._id),
          key: gift.key,
          name: gift.name,
          image: gift.image,
          category: gift.category
        }
      }
    });

    const updated = await User.findById(auth.user._id).select("coins");

    await Promise.all([
      CoinLedger.create({
        userId: auth.user._id,
        delta: -gift.coins,
        balanceAfter: updated?.coins ?? 0,
        reason: "gift_send",
        metadata: {
          receiverId: String(receiver._id),
          giftId: String(gift._id),
          messageId: String(message._id),
          cost: gift.coins
        }
      }),
      GiftTransaction.create({
        senderId: auth.user._id,
        receiverId: receiver._id,
        giftId: gift._id,
        coins: gift.coins,
        messageId: message._id
      })
    ]);

    return ok(
      {
        message: {
          ...message.toObject(),
          gift: {
            id: String(gift._id),
            key: gift.key,
            name: gift.name,
            image: gift.image,
            coins: gift.coins,
            category: gift.category
          }
        },
        senderCoins: updated?.coins ?? 0
      },
      { status: 201 }
    );
  });
}
