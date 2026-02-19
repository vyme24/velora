import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/http";
import { Message } from "@/models/Message";
import { requireAuthUser } from "@/lib/require-auth";
import { withApiHandler } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrf } from "@/lib/csrf";
import { User } from "@/models/User";
import { CoinLedger } from "@/models/CoinLedger";

const MESSAGE_COST = 50;

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const receiver = req.nextUrl.searchParams.get("receiver");
    const cursor = req.nextUrl.searchParams.get("cursor");

    if (!receiver) return fail("receiver is required", 422);

    const query: Record<string, unknown> = {
      $or: [
        { sender: auth.user._id, receiver },
        { sender: receiver, receiver: auth.user._id }
      ]
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor) };
    }

    const messages = await Message.find(query).sort({ createdAt: -1 }).limit(50);

    return ok({
      items: messages.reverse(),
      nextCursor: messages.length ? messages[messages.length - 1].createdAt : null
    });
  });
}

export async function POST(req: NextRequest) {
  return withApiHandler(req, async () => {
    if (!verifyCsrf(req)) return fail("Invalid CSRF token", 403);

    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const limiter = checkRateLimit(`chat:${String(auth.user._id)}`, 80, 60_000);
    if (!limiter.allowed) return fail("Too many messages", 429);

    const body = await req.json();

    if (!body?.receiver || (!body?.message && !body?.image)) {
      return fail("Invalid message payload", 422);
    }

    const content = String(body.message || "").trim();
    if (content.length > 2000) {
      return fail("Message too long", 422);
    }

    const deduction = await User.updateOne(
      { _id: auth.user._id, coins: { $gte: MESSAGE_COST } },
      { $inc: { coins: -MESSAGE_COST } }
    );

    if (!deduction.modifiedCount) {
      return fail(`Insufficient coins. ${MESSAGE_COST} coins required per message`, 402);
    }

    let message;
    try {
      message = await Message.create({
        sender: auth.user._id,
        receiver: body.receiver,
        message: content,
        image: body.image || "",
        metadata: {
          type: body.image ? "image" : "text",
          requiresCoins: true,
          consumedCoins: MESSAGE_COST
        }
      });
    } catch (error) {
      await User.updateOne({ _id: auth.user._id }, { $inc: { coins: MESSAGE_COST } });
      throw error;
    }

    const updated = await User.findById(auth.user._id).select("coins");

    await CoinLedger.create({
      userId: auth.user._id,
      delta: -MESSAGE_COST,
      balanceAfter: updated?.coins ?? 0,
      reason: "message_unlock",
      metadata: {
        receiverId: body.receiver,
        messageId: String(message._id),
        cost: MESSAGE_COST
      }
    });

    return ok({ ...message.toObject(), senderCoins: updated?.coins ?? 0 }, { status: 201 });
  });
}
