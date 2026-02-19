import { NextRequest } from "next/server";
import { ok } from "@/lib/http";
import { requireAuthUser } from "@/lib/require-auth";
import { Like } from "@/models/Like";
import { withApiHandler } from "@/lib/api";

export async function GET(req: NextRequest) {
  return withApiHandler(req, async () => {
    const auth = await requireAuthUser(req);
    if ("response" in auth) return auth.response;

    const [sentLikes, receivedLikes] = await Promise.all([
      Like.find({ sender: auth.user._id })
        .populate("receiver", "_id name age photos location isOnline")
        .sort({ createdAt: -1 })
        .limit(300),
      Like.find({ receiver: auth.user._id })
        .populate("sender", "_id name age photos location isOnline")
        .sort({ createdAt: -1 })
        .limit(300)
    ]);

    return ok({
      sent: sentLikes.map((like) => ({
        _id: String(like._id),
        createdAt: like.createdAt,
        user: like.receiver
      })),
      received: receivedLikes.map((like) => ({
        _id: String(like._id),
        createdAt: like.createdAt,
        user: like.sender
      }))
    });
  });
}
